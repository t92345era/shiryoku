package route

import (
    _ "fmt"
		_ "log"
		"net/http"
)

// ルートアクセスおよび、その他URLパターンにマッチしない時の処理
func Index(w http.ResponseWriter, r *http.Request) {

	if r.URL.Path == "/google9d517c5e09ee4c9c.html" {
		http.ServeFile(w, r, "google9d517c5e09ee4c9c.html")
		return
	}

	if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			//ルートアクセス
			http.ServeFile(w, r, "static/index.html")
	} else {
			//ルート以外のアクセスは 404エラー
			http.NotFound(w, r)
			return
	}
}