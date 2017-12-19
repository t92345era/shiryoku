package route

import (
    "net/http"
		"log"
)

//静的ファイルを返却するルーティングルール (static)
func StaticFile(w http.ResponseWriter, r *http.Request) {
		//w.Write([]byte("<h1>It works!2</h1>\n"))

		//fmt.Println(r.URL)
		log.Println(r.URL.Path)
		//fmt.Println(r.URL.Path[1:])
		http.ServeFile(w, r, r.URL.Path[1:])
}

//静的ファイルを返却するルーティングルール (node_modules)
func StaticFileNode(w http.ResponseWriter, r *http.Request) {
		//w.Write([]byte("<h1>It works!2</h1>\n"))

		//fmt.Println(r.URL)
		log.Println(r.URL.Path)
		//fmt.Println(r.URL.Path[1:])
		http.ServeFile(w, r, r.URL.Path[1:])
}