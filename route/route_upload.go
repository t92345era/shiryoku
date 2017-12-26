package route

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"shiryoku/spk"
	"strconv"
)

/**
* 音声ファイルのアップロード
 */
func UploadAudio(w http.ResponseWriter, r *http.Request) {
	fmt.Println("url:/upload_audio/")

	if r.Method != "POST" {
		http.NotFound(w, r)
		return
	}

	r.ParseMultipartForm(32 << 20)
	file, handler, err := r.FormFile("uploadfile")
	if err != nil {
		http.Error(w, "uploadfile Error!", http.StatusBadRequest)
		return
	}

	//サンプルレートを取得
	sampleRage, _ := strconv.ParseInt(r.Form["samplerate"][0], 10, 32)
	fmt.Println("sampleRate=", sampleRage)

	defer file.Close()
	//	fmt.Fprintf(w, "%v", handler.Header)
	var honban = os.Getenv("SHIRYOKU_HONBAN")
	var filePath string
	if honban == "YES" {
		filePath = "/home/unicef/go/src/shiryoku/test/" + handler.Filename
	} else {
		filePath = "/Users/teramotosatoshishi/go/src/shiryoku/test/" + handler.Filename
	}

	f, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer f.Close()
	io.Copy(f, file)

	scripts := spk.CallSpeakApi(filePath, int32(sampleRage))
	js, errJ := json.Marshal(scripts)
	if errJ != nil {
		log.Fatalf("error: %v", errJ)
		http.Error(w, errJ.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Println("js=", js)
	w.Write(js)
}
