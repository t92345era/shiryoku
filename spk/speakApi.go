// Sample speech-quickstart uses the Google Cloud Speech API to transcribe
// audio.
package spk

import (
	"fmt"
	"io/ioutil"
	"log"

	// Imports the Google Cloud Speech API client package.
	"golang.org/x/net/context"

	speech "cloud.google.com/go/speech/apiv1beta1"
	speechpb "google.golang.org/genproto/googleapis/cloud/speech/v1beta1"
)

func CallSpeakApi(path string) []string {

	fmt.Println("start!!")

	ctx := context.Background()

	// Creates a client.
	client, err := speech.NewClient(ctx)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	// Sets the name of the audio file to transcribe.
	filename := path
	fmt.Println("file=", filename)

	// Reads the audio file into memory.
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}
	fmt.Println("read end!!")

	// Detects speech in the audio file.
	resp, err := client.SyncRecognize(ctx, &speechpb.SyncRecognizeRequest{
		Config: &speechpb.RecognitionConfig{
			Encoding:     speechpb.RecognitionConfig_LINEAR16,
			SampleRate:   44100,
			LanguageCode: "ja_JP",
			SpeechContext: &speechpb.SpeechContext{
				Phrases: []string{"うえ", "した", "みぎ", "ひだり"},
			},
		},
		Audio: &speechpb.RecognitionAudio{
			AudioSource: &speechpb.RecognitionAudio_Content{Content: data},
		},
	})

	var scripts []string

	// Prints the results
	for _, result := range resp.Results {
		for _, alt := range result.Alternatives {
			//fmt.Printf("\"%v\" (confidence=%3f)\n", alt.Transcript, alt.Confidence)
			scripts = append(scripts, alt.Transcript)
		}
	}
	fmt.Println("scripts:", scripts)
	return scripts
}
