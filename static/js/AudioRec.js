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

        var input = this.audioContext.createMediaStreamSource(stream);
        input.connect(this.lowpassFilter);
        //
        this.drawCanvas();
      });
  }

  /**
   * キャンパスに波形を描画
   */
  drawCanvas() {

    var requestAnimationFrame = window.requestAnimationFrame ||
　　　　　　　　　　　　　　　　　　　window.mozRequestAnimationFrame ||
                              　window.webkitRequestAnimationFrame ||
　　　　　　　　　　　　　　　　　　　window.msRequestAnimationFrame;
    //window.requestAnimationFrame = requestAnimationFrame;

    //アナライザ
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeContant = 0.9;
    this.analyser.fftSize = 2048;  // The default value
    this.lowpassFilter.connect(this.analyser);

    //描画用キャンパス
    var canvas        = document.querySelector('canvas');
    var canvasContext = canvas.getContext('2d');

    //500Hz毎の間隔
    var fsDivN = this.audioContext.sampleRate / this.analyser.fftSize;
    this.analyser.maxDecibels = -10;

    console.log("max=" + this.analyser.maxDecibels);
    
    //アニメーションフレーム
    var loopFrame = () => {
      requestAnimationFrame(loopFrame);

      // canvalをクリア
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      // dbのレンジ
      var range = this.analyser.maxDecibels - this.analyser.minDecibels;

      // デシベル単位の波形データを取得
      var spectrums = new Float32Array(this.analyser.frequencyBinCount);  // Array size is 1024 (half of FFT size)
      this.analyser.getFloatFrequencyData(spectrums);

      canvasContext.beginPath();

      for (var i = 0, len = spectrums.length; i < len; i++) {
        var x = (i / len) * canvas.width;
        var y = (-1 * ((spectrums[i] - this.analyser.maxDecibels) / range)) * canvas.height;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      }

      canvasContext.strokeStyle = "#339";
      canvasContext.stroke();

      // Draw text and grid (Y)
      canvasContext.fillStyle = "#999";
      for (var i = this.analyser.minDecibels; i <= this.analyser.maxDecibels; i += 10) {
        var gy = (-1 * ((i - this.analyser.maxDecibels) / range)) * canvas.height;
        // Draw grid (Y)
        canvasContext.fillRect(0, gy, canvas.width, 1);
        // Draw text (Y)
        canvasContext.fillText((i + ' dB'), 0, gy);
      }
    };
    loopFrame();
    

  }

  anaTest() {

    var canvas        = document.querySelector('canvas');
    var canvasContext = canvas.getContext('2d');

    //5ミリ秒の間隔
    var n5msec = Math.floor(5 * Math.pow(10, -3) * this.audioContext.sampleRate);

    //500Hz毎の間隔
    var fsDivN = this.audioContext.sampleRate / this.analyser.fftSize;

    this.analyser.fftSize = 2048;  // The default value
    var intervalid = setInterval(() => {

      // canvalをクリア
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      // Get data for drawing sound wave
      // 波形データを取得 
      //var times = new Uint8Array(this.analyser.fftSize);
      //this.analyser.getByteTimeDomainData(times);
      var times = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(times);

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

        // //5ミリ秒毎に枠を描画
        // if (i % n5msec == 0) {
        //   canvasContext.fillStyle = "#999999";
        //   canvasContext.fillRect(x, 0, 1, canvas.height);
        // }

        var f = Math.floor(i * fsDivN);
        // 500Hz毎に枠を描画
        if ((f % 500) === 0) {
          canvasContext.fillStyle = "#999999";
          canvasContext.fillRect(x, 0, 1, canvas.height);
        }

      }

      canvasContext.strokeStyle = "#339";
      canvasContext.stroke();

      // Draw text and grid (Y)
      var textYs = ['1.00', '0.00', '-1.00'];
      for (var i = 0; i < textYs.length; i++) {
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

  drawDe() {

    var canvas        = document.querySelector('canvas');
    var canvasContext = canvas.getContext('2d');

    //500Hz毎の間隔
    var fsDivN = this.audioContext.sampleRate / this.analyser.fftSize;
    this.analyser.fftSize = 2048;  // The default value
    this.analyser.maxDecibels = -10;

    console.log("max=" + this.analyser.maxDecibels);
    
    var intervalid = setInterval(() => {

      // canvalをクリア
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      // dbのレンジ
      var range = this.analyser.maxDecibels - this.analyser.minDecibels;

      // デシベル単位の波形データを取得
      var spectrums = new Float32Array(this.analyser.frequencyBinCount);  // Array size is 1024 (half of FFT size)
      this.analyser.getFloatFrequencyData(spectrums);

      canvasContext.beginPath();

      for (var i = 0, len = spectrums.length; i < len; i++) {
        var x = (i / len) * canvas.width;
        var y = (-1 * ((spectrums[i] - this.analyser.maxDecibels) / range)) * canvas.height;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      }

      canvasContext.strokeStyle = "#339";
      canvasContext.stroke();

      // Draw text and grid (Y)
      canvasContext.fillStyle = "#999";
      for (var i = this.analyser.minDecibels; i <= this.analyser.maxDecibels; i += 10) {
        var gy = (-1 * ((i - this.analyser.maxDecibels) / range)) * canvas.height;
        // Draw grid (Y)
        canvasContext.fillRect(0, gy, canvas.width, 1);
        // Draw text (Y)
        canvasContext.fillText((i + ' dB'), 0, gy);
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