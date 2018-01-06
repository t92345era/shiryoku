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
    this.koeFlg = false;
    
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
    this.lowpassFilter.frequency.value = 8000;

    //ゲイン
    this.audioContext.createGain = this.audioContext.createGain || this.audioContext.createGainNode;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;

    //レコーダ
    this.recorder = new Recorder(
      this.gainNode, { 
        workerPath: 'js/recorderjs/recorderWorker.js',
        numChannels: 1
      });

    //音声の使用許可申請
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        this.supportAudio = true;

        var input = this.audioContext.createMediaStreamSource(stream);
        this.inputSource = input;
        input.connect(this.gainNode);
        this.gainNode.connect(this.lowpassFilter);
        
        //
        this.drawCanvas();
        //this.testDomain();
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
    this.analyser.fftSize = 1024;  // The default value
    this.lowpassFilter.connect(this.analyser);

    //描画用キャンパス
    var canvas        = document.querySelector('canvas');
    var canvasContext = canvas.getContext('2d');
    var gLeft = 35;
    var gWidth = canvas.width - gLeft - 10;
    var gTop = 10;
    var gYLabelHeight = 20;
    var gHeight = canvas.height - gYLabelHeight - gTop;
    
    //500Hz毎の配列インデックス間隔
    // /var fsDivN = this.audioContext.sampleRate / this.analyser.fftSize;
    var fsDivN = this.lowpassFilter.frequency.value / this.analyser.fftSize;
    //this.lowpassFilter.frequency.value
    var n500Hz = Math.floor(500 / fsDivN);

    //5msec毎のインデックス間隔
    var n5msec = Math.floor(5 * Math.pow(10, -3) * this.audioContext.sampleRate);
    //配列データ１件あたりの秒数 (ex. 0.0000020)
    var period = 1 / this.audioContext.sampleRate;
    
    this.analyser.minDecibels = -100;
    this.analyser.maxDecibels = -10;

    // var metrics = canvasContext.measureText("8");
    // console.log(metrics);

    console.log("max=" + this.analyser.maxDecibels);

    const KANSHI_MIN = 150;
    const KANSHI_MAX = 800;
    //8000
    //var minFIndex = this.frequencyToIndex(KANSHI_MIN, this.audioContext.sampleRate, this.analyser.frequencyBinCount);
    //var maxFIndex = this.frequencyToIndex(KANSHI_MAX, this.audioContext.sampleRate, this.analyser.frequencyBinCount);
    var minFIndex = this.frequencyToIndex(KANSHI_MIN, 8000, this.analyser.frequencyBinCount);
    var maxFIndex = this.frequencyToIndex(KANSHI_MAX, 8000, this.analyser.frequencyBinCount);
    console.log("minFIndex=" + minFIndex);
    console.log("maxFIndex=" + maxFIndex);

    var prevKoeDate = new Date();
    var startKoeDate = new Date();
    
    //アニメーションフレーム
    var loopFrame = () => {
      requestAnimationFrame(loopFrame);

      // canvalをクリア
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);
      canvasContext.fillStyle = "#ccc";
      canvasContext.globalAlpha = 1;

      // dbのレンジ
      var range = this.analyser.maxDecibels - this.analyser.minDecibels;

      // デシベル単位の波形データを取得
      var spectrums = new Float32Array(this.analyser.frequencyBinCount);  // Array size is 1024 (half of FFT size)
      this.analyser.getFloatFrequencyData(spectrums);
      canvasContext.beginPath();

      for (var i = 0, len = spectrums.length; i < len; i++) {

        var x = gLeft + ((i / len) * gWidth);
        var y = (-1 * ((spectrums[i] - this.analyser.maxDecibels) / range)) * gHeight;
        y += gTop;

        if (spectrums[i] >= this.analyser.minDecibels) {
          if (i === 0) {
            canvasContext.moveTo(x, y);
          } else {
            canvasContext.lineTo(x, y);
          }
        }

        if ((i % n500Hz) === 0) {
          canvasContext.fillRect(x, gTop, 1, gHeight);
        }

        //認識範囲の配列インデックスか？
        var now = new Date();
        if (i >= minFIndex && i <= maxFIndex) {
          if (spectrums[i] >= -45) {
            prevKoeDate = now;
            if (!this.koeFlg) startKoeDate = new Date();
            this.koeFlg = true;
          } else if (this.koeFlg == true) {
            if (now.getTime() - prevKoeDate.getTime() > 1000 ) {
              this.koeFlg = false;
              if (prevKoeDate.getTime() - startKoeDate.getTime() > 100) {
                EventEmitter.instance().emit("onEndSpeech");
              }
            }
          }
        }
      }

      canvasContext.strokeStyle = "#339";
      canvasContext.lineWidth = 2;
      canvasContext.stroke();

      // 時間単位の波形データ取得
      var times = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(times);
      canvasContext.beginPath();

      // (1が255, 0 (無音) が128, -1が0)となるよう正規化
      for (var i = 0, len = times.length; i < len; i++) {

        // x,y座標計算
        var x = gLeft + ((i / len) * gWidth);
        var y = (1 - (times[i] / 255)) * gHeight;
        y += gTop;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }

        if (i % n5msec == 0) {
          var msec = Math.round((i * period) * 1000);
          canvasContext.fillText(msec, x, 9);
        }
      }

      canvasContext.strokeStyle = "#933";
      canvasContext.lineWidth = 1.5;
      canvasContext.stroke();

      // Draw text and grid (Y)
      canvasContext.fillStyle = "#ccc";
      canvasContext.font = "10px 'Times New Roman'";
      for (var i = this.analyser.minDecibels; i <= this.analyser.maxDecibels; i += 10) {
        var gy = (-1 * ((i - this.analyser.maxDecibels) / range)) * gHeight;
        gy += gTop;
        // Draw grid (Y)
        canvasContext.fillRect(gLeft, gy, gWidth, 1);
        // Draw text (Y)
        canvasContext.fillText((i + ' dB'), 0, gy + 5);
      }


      {
        var x = gLeft + ((minFIndex / this.analyser.frequencyBinCount) * gWidth);  
        var x2 = gLeft + ((maxFIndex / this.analyser.frequencyBinCount) * gWidth);  
        canvasContext.globalAlpha = 0.3;
        canvasContext.fillStyle = "#33f";
        canvasContext.fillRect(x, gTop, x2 - x, gHeight);
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

  testDomain() {
    //var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeContant = 0.9;
    this.analyser.fftSize = 1024;  // The default value
    this.gainNode.connect(this.analyser);
    var analyser = this.analyser;    

    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Float32Array(bufferLength);


    var canvas        = document.querySelector('canvas');
    var canvasCtx     = canvas.getContext('2d');
    
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    function draw() {
      requestAnimationFrame(draw);
      analyser.getFloatTimeDomainData(dataArray);
    
      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
      canvasCtx.beginPath();
    
      var sliceWidth = canvas.width * 1.0 / bufferLength;
      var x = 0;
    
      for(var i = 0; i < bufferLength; i++) {
        var v = dataArray[i] * 200.0;
        var y = canvas.height/2 + v;
    
        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
    
      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
    };
    
    draw();
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
    
    if (this.isRecording()) {
      console.log("AudioRec.stopRec()");
      this.recorder.stop();
      this.recorder.exportWAV(this.wavExported);
    } else {
      console.log("AudioRec.stopRec() Already Stopped!!");
    }
  }

  /**
   * 録音のキャンセル
   */
  cancelRec() {

    if (this.isRecording()) {
      console.log("AudioRec.cancelRec()");
      this.recorder.stop();
      EventEmitter.instance().emit("onCancelRec");
    } else {
      console.log("AudioRec.stopRec() Already Stopped!!");
    }
  }

  /**
   * 現在録音中かを取得する
   * @return 録音中の場合、true
   */
  isRecording() {
    return this.recorder && this.recorder.recording;
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

  frequencyToIndex (frequency, sampleRate, frequencyBinCount) {
    var nyquist = sampleRate / 2
    var index = Math.round(frequency / nyquist * frequencyBinCount)
    //return clamp(index, 0, frequencyBinCount)
    return Math.max(Math.min(index, frequencyBinCount), 0);
  }
  
  analyserFrequencyAverage (div, analyser, frequencies, minHz, maxHz) {
    var sampleRate = analyser.context.sampleRate
    var binCount = analyser.frequencyBinCount
    var start = frequencyToIndex(minHz, sampleRate, binCount)
    var end = frequencyToIndex(maxHz, sampleRate, binCount)
    var count = end - start
    var sum = 0
    for (; start < end; start++) {
      sum += frequencies[start] / div
    }
    return count === 0 ? 0 : (sum / count)
  }
  
}