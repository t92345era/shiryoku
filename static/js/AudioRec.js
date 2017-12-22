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
    this.sampleRate = -1;
    this.lowpassFilter = null;
    this.analyser = null;
    this.oscillator = null;
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

    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    //context
    this.audioContext = new AudioContext();
    this.sampleRate = this.audioContext.sampleRate;
    console.log("sample rate:" + this.sampleRate);
 
    //ローパスフィルタ
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter.type = 0;
    this.lowpassFilter.frequency.value = 20000;
 
    //アナライザ
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeContant = 0.9;

    this.oscillator = this.audioContext.createOscillator();
    // for legacy browsers
    this.oscillator.start = this.oscillator.start || this.oscillator.noteOn;
    this.oscillator.stop  = this.oscillator.stop  || this.oscillator.noteOff;
    // OscillatorNode (Input) -> AnalyserNode (Visualization) -> AudioDestinationNode (Output)
    this.oscillator.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

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


        this.anaTest();
      });
  }

  anaTest() {

    var canvas        = document.querySelector('canvas');
    var canvasContext = canvas.getContext('2d');

    this.analyser.fftSize = 2048;  // The default value
    var intervalid = setInterval(() => {

      // canvalをクリア
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      // Get data for drawing sound wave
      // 波形データを取得 
      var times = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(times);

      canvasContext.beginPath();

      // (1が255, 0 (無音) が128, -1が0)となるよう正規化
      for (var i = 0, len = times.length; i < len; i++) {

        // x,y座標計算
        var x = (i / len) * canvas.width;
        var y = (1 - (times[i] / 255)) * canvas.height;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      }

      canvasContext.stroke();


      // Draw text and grid (Y)
      var textYs = ['1.00', '0.00', '-1.00'];
      for (var i = 0, i = textYs.length; i < len; i++) {
         //console.log("i=" + i);
          var text = textYs[i];
          var gy   = ((1 - parseFloat(text)) / 2) * canvas.height;
          // Draw grid (Y)
          canvasContext.fillRect(0, gy, canvas.width, 1);
          // Draw text (Y)
          canvasContext.fillText(text, 3, gy);
      }
    }, 500);

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