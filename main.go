package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/fcgi"
	"os"
	"os/signal"
	"shiryoku/route"
	_ "strconv"
	"syscall"
)

//import _ "sukesan/model"
//import "sukesan/util"

/**********************************************
// メイン処理
**********************************************/
func main() {
	fmt.Println("＊＊＊＊＊ 開始 ＊＊＊＊＊＊")

	//ハンドラを作成
	mux := http.NewServeMux()

	//ルーティングの設定
	routeSetting(mux)

	log.Println("環境変数取得")
	var honban = os.Getenv("SHIRYOKU_HONBAN")
	var listener net.Listener
	var err error

	log.Println("ENV=", honban)

	if honban == "YES" {
		log.Println("本番モードの開始")
		listener, err = net.Listen("unix", "/var/run/gopher/shiryoku.sock")
	} else {
		log.Println("開発モードの開始")
		listener, err = net.Listen("tcp", ":8089")
	}

	if err != nil {
		log.Fatalf("error: %v", err)
	}

	defer func() {
		if err := listener.Close(); err != nil {
			log.Printf("error: %v", err)
		}
	}()

	shutdown(listener)

	if honban == "YES" {

		if err := os.Chmod("/var/run/gopher/shiryoku.sock", 0774); err != nil {
			log.Fatal(err)
		}

		log.Println("本番Webサーバ起動開始...")
		if err := fcgi.Serve(listener, mux); err != nil {
			log.Fatalf("error: %v", err)
		}
	} else {
		log.Println("開発Webサーバ起動開始...")
		if err := http.Serve(listener, mux); err != nil {
			log.Fatalf("error: %v", err)
		}
	}
}

/**********************************************
// ルーディングの設定
**********************************************/
func routeSetting(mux *http.ServeMux) {

	//ルートアクセス
	mux.HandleFunc("/", route.Index)

	//静的ファイルを返却するルーティングルール (static)
	mux.HandleFunc("/static/", route.StaticFile)

	//SSL用
	mux.HandleFunc("/.well-known/", route.StaticFile)

	//音声ファイルアップロード用
	mux.HandleFunc("/upload_audio/", route.UploadAudio)

	//静的ファイルを返却するルーティングルール (node_modules)
	mux.HandleFunc("/node_modules/", route.StaticFileNode)

}

/**********************************************
//シャットダウンシグナルが来るまで待機し、シグナル受信でWebサーバを停止するための処理
**********************************************/
func shutdown(listener net.Listener) {

	log.Println("シャットダウンシグナル監視の開始...")
	c := make(chan os.Signal, 2)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Println("シャットダウンシグナルが来るまで待機...")
		_ = <-c

		log.Println("シャット開始...")
		if err := listener.Close(); err != nil {
			log.Printf("error: %v", err)
		}
		log.Println("シャット終了")

		os.Exit(1)
	}()
}
