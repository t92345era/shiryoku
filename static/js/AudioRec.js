/**
 * 音声録音・認識クラス
 */
class AudioRec {
  /**
   * コンストラクタ
   */
  constructor() {
    this.supportAudio = false;
    this.mediaRecorder = null;
    this.handleStop = this.handleStop.bind(this);
    this.handleDataAvailable = this.handleDataAvailable.bind(this);
    this.playerId = "";

    this.audioContext = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.recorder = null;
    this.wavExported = this.wavExported.bind(this);
    

    //初期化処理
    this.init();
  }

  /**
   * インスタンスの取得
   */
  static instance() {
    if (typeof AudioRec._instance === "undefined") {
      AudioRec._instance =  new AudioRec();
    }
    return AudioRec._instance;
  }

  /**
   * 初期化処理
   */
  init() {

    //context
    this.audioContext = new AudioContext();
    var sampleRate = this.audioContext.sampleRate;
    console.log("sample rate:" + sampleRate);
 
    //ローパスフィルタ
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter.type = 0;
    this.lowpassFilter.frequency.value = 20000;
 
    //アナライザ
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeContant = 0.9;

    //レコーダ
    this.recorder = new Recorder(
      this.lowpassFilter, { 
        workerPath: 'js/recorderjs/recorderWorker.js',
        numChannels: 1
      });

    //音声の使用許可申請
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        this.supportAudio = true;
        // const options = {mimeType: 'video/webm;codecs=vp9'};
        // this.mediaRecorder = new MediaRecorder(stream, options);
        // this.mediaRecorder.addEventListener('stop', this.handleStop);
        // this.mediaRecorder.addEventListener('dataavailable', this.handleDataAvailable);

        var input = this.audioContext.createMediaStreamSource(stream);
        input.connect(this.lowpassFilter);
        this.lowpassFilter.connect(this.analyser);

      });
  }

  /**
   * 指定時間(ミリ秒指定)録音するメソッド
   * @param {*} millisecond 
   */
  timerRec(millisecond) {
    this.startRec();
    setTimeout(() => {
      this.stopRec();
    }, millisecond);
  }

  /**
   * 録音開始
   */
  startRec() {
    console.log("AudioRec.start()");
    //this.mediaRecorder.start();
    this.recorder && this.recorder.record();
  }

  /**
   * 録音停止
   */
  stopRec() {
    console.log("AudioRec.stopRec()");
    //this.mediaRecorder.stop();
    this.recorder && this.recorder.stop();
    this.recorder && this.recorder.exportWAV(this.wavExported);
  }

  /**
   * 録音した音声データをwavにエクスポート
   * @param {blog} blob 
   */
  wavExported(blob) {
    console.log("AudioRec.wavExported");
    //var url = URL.createObjectURL(blob);
    EventEmitter.instance().emit("onDataAvailable", blob);

    if (this.playerId != "") {
      var audio = document.getElementById(this.playerId);  
      audio.src = URL.createObjectURL(blob);
    }

    this.recorder.clear();
  }

  /**
   * 停止処理のハンドル
   */
  handleStop(e) {
    console.log("AudioRec.handleStop()");
  }

  /**
   * データのハンドル
   */
  handleDataAvailable(e) {
    // console.log("AudioRec.handleDataAvailable()");
    // var audioURL = window.URL.createObjectURL(new Blob([e.data]));

    // if (this.playerId != "") {
    //   var audio = document.getElementById(this.playerId);  
    //   audio.src = audioURL;
    // }

    // EventEmitter.instance().emit("onDataAvailable", audioURL);
  }
  
}