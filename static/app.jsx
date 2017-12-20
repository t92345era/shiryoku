//import Test from './componets/Test';

class Util {
  static isFunction(target) {
    return typeof target === "function";
  }
}

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() { return (
    <div className="header">
      <h1>タイトル</h1>
    </div>
  );}
}

const STATE = {
  START: 0,
  SHUDAI_WAIT: 1,
  SHUDAI_TYU: 2,
  RESULT: 3,
  GAME_ENDING: 4,
  GAME_RESULT: 5
};

/**
 * 共有データクラス
 */
class SharedData {
  /**
   * コンストラクタ
   */
  constructor() {
      this.lvl = 1;
      this.renzokuCnt = 0;
  }
  /**
   * インスタンス取得
   */
  static instance() {
    if (typeof SharedData._instance === "undefined") {
      SharedData._instance =  new SharedData();
    }
    return SharedData._instance;
  }
}

// -------------------------------------------------------

/**
 * スタート画面
 * @param onStart  イベント  引数(なし)
 */
class StartMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};    
    this.gameStart = this.gameStart.bind(this);
  }

  /**
   * スタートボタン押下時の処理
   */
  gameStart() {
    EventEmitter.instance().emit("onGameStart");
    EventEmitter.instance().emit("onStateChange", STATE.SHUDAI_WAIT);
  }

  render() { return (
    <div className="startMenu">
      <button onClick={this.gameStart}>スタート</button>
    </div>
  );}
}

// -------------------------------------------------------

/**
 * ゲーム画面
 * @param sts   ゲーム状態受取用
 */
class GameWin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      renzokuCnt: 0,
      ngRenCnt: 0,
      lvl: 1,
      downloadLink: "",
      isRec: false,
      lastScript: ""
    };
    this.rec = null;
    this.handleStart = this.handleStart.bind(this);
    this.handleAns = this.handleAns.bind(this);
    this.gameEnd = this.gameEnd.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
    this.handleShutsuDai = this.handleShutsuDai.bind(this);
    this.handleRecDataAvailable = this.handleRecDataAvailable.bind(this);
    this.talkAns = this.talkAns.bind(this);
    
  }

  //マウント
  componentDidMount() {
    this.rec = AudioRec.instance();
    this.rec.playerId = "player";
    EventEmitter.instance().on("onAns", this.handleAns);
    EventEmitter.instance().on("onShutsuDai", this.handleShutsuDai);
    EventEmitter.instance().on("onDataAvailable", this.handleRecDataAvailable);
  }

  //アンマウント
  componentWillUnmount() {
    EventEmitter.instance().off("onAns", this.handleAns);
    EventEmitter.instance().off("onShutsuDai", this.handleShutsuDai);
    EventEmitter.instance().off("onDataAvailable", this.handleRecDataAvailable);
  }

  /**
   * 問題出題時の処理
   * @param {string} direction 
   */
  handleShutsuDai(direction) {
    this.rec.timerRec(5000);
    this.setState({
      isRec: true,
      lastScript: ""
    });
  }

  /**
   * 回答時の処理
   * @param {string} result 
   */
  handleAns(result) {

    this.setState((prevState, props) => {
      let cnt = result == "OK" ? prevState.renzokuCnt + 1 : 0;
      let ngCnt = (result == "NG" ? this.state.ngRenCnt + 1 : 0);

      //２回連続で正解した場合は、レベルアップ
      let afterLv = prevState.lvl;
      if (cnt == 2 && prevState.lvl < 10) {
        afterLv++;
        cnt = 0;
      }
      return {
        renzokuCnt: cnt,
        lvl: afterLv,
        ngRenCnt: ngCnt
      };
    }, () => {
      console.log(`cnt=${this.state.renzokuCnt} lvl=${this.state.lvl}`);
      //ゲーム終了判定(レベル10達成 or ３回連続間違えた)
      if (this.state.lvl == 10 || this.state.ngRenCnt >= 3) {
        EventEmitter.instance().emit("onStateChange", STATE.GAME_ENDING);
        setTimeout(() => {
          this.gameEnd();  
        }, 1000);
      }
    });
  }

  /**
   * 録音終了時のハンドル
   * @param {string} dataUrl 
   */
  handleRecDataAvailable(blob) {

    var url = URL.createObjectURL(blob);
    this.setState({
      downloadLink: url
    });

    //音声ファイル送信
    var formData = new FormData();
    var fileOfBlob = new File([blob], 'rec.wav');
    formData.append("uploadfile", fileOfBlob);
    
    $.ajax({
        url: '/upload_audio/',
        type: 'post',
        data: formData,
        processData: false,
        contentType: false
    }).then((data) => {
      this.setState({ isRec: false });
      this.talkAns(data);
    }, (err) => {
      this.setState({ isRec: false });
      alert("file upload errror!!" + err);
    });
  }

  /**
   * 声での回答
   * @param {string} scripts 
   */
  talkAns(scripts) {
    if (!(scripts instanceof Array)) {
      return;
    }

    var index = scripts.length - 1;
    var direction = "";
    if (scripts[index] == "ひだり") {
      direction = "left";
    } else if (scripts[index] == "みぎ") {
      direction = "right";
    } else if (scripts[index] == "うえ") {
      direction = "up";
    } else if (scripts[index] == "した") {
      direction = "down";
    }

    //最後に認識したことばをセット
    this.setState({ lastScript: scripts[index] });

    if (direction != "") {
      this.refs.mondai.ans(direction);
    }
  }

  /**
   * ゲーム終了
   */
  gameEnd() {
    EventEmitter.instance().emit("onStateChange", STATE.GAME_RESULT);
  }

  /**
   * 問題出題コンポーネントを表示するかどうか
   */
  isShowMondai() {
    return this.props.sts == STATE.SHUDAI_TYU 
      || this.props.sts == STATE.SHUDAI_WAIT
      || this.props.sts == STATE.RESULT
      || this.props.sts == STATE.GAME_ENDING;
  }

  /**
   * もう一度ボタンクリック時の処理
   */
  handleRetry() {
    this.setState({
      renzokuCnt: 0,
      ngRenCnt: 0,
      lvl: 1
    }, () => {
      EventEmitter.instance().emit("onStateChange", STATE.SHUDAI_WAIT);
    });
  }

  /**
   * スタート画面に戻るボタン押下時の処理
   */
  handleStart() {
    EventEmitter.instance().emit("onStateChange", STATE.START);
  }

  render() { return (
  <div className="gameWin">
  {this.isShowMondai() && 
    <div>
      <div className="rec-state">
      {this.state.isRec &&
        <span>認識中</span>}
      {(!this.state.isRec && this.state.lastScript != "") &&
        <span>認識した言葉：{this.state.lastScript}</span>}
      </div>
      <Mondai ref="mondai" 
              sts={this.props.sts} 
              lvl={this.state.lvl}/>
    </div>}
  {this.props.sts == STATE.GAME_RESULT &&
    <div>
      <h2>あなたのレベルは {this.state.lvl} です。</h2>  
      <button onClick={this.handleRetry}>もう一度</button>
    </div>}
    <div>
      <button onClick={this.handleStart}>スタート画面に戻る</button>
    </div>
    <div>
      <a download="test.wav" href={this.state.downloadLink}>download!!</a>
    </div>
    <div style={{ marginTop: 10}}>
      <audio controls="controls" id="player"></audio>
    </div>
  </div>
  );}
}

/**
 * 問題出題用
 * @param onAns  イベント  引数(回答内容(left/top/right/bottom))
 * @param sts   ゲーム状態受取用    (必須)
 * @param lvl   ゲームレベル受取用  (必須)
 */
class Mondai extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currntDirection: "",
      result: ""
    }; 
    this.handleNext = this.handleNext.bind(this);
  }

  /**
   * 現在回答可能な状態かを取得する
   */
  canAns() {
    return this.props.sts == STATE.SHUDAI_TYU;
  }

  /**
   * 回答ボタン押下
   * @param {number} direction 
   */
  ans(direction) {
    if (this.props.sts != STATE.SHUDAI_TYU) {
      return;
    }
    var ret = this.state.currntDirection == direction ? "OK" : "NG";
    this.setState({
      result: ret
    }, () => {
      EventEmitter.instance().emit("onAns", this.state.result);
      EventEmitter.instance().emit("onStateChange", STATE.RESULT);
    });
  }

  /**
   * 次の問題出題ボタン押下時の処理
   */
  handleNext() {
    this.shutsuDai();
  }

  /**
   * 出題ボタン押下時の処理
   */
  shutsuDai() {
    var direction = this.randomDirection();
   
    this.setState({
      currntDirection: direction
    }, () => {
      EventEmitter.instance().emit("onShutsuDai", this.currntDirection);
      EventEmitter.instance().emit("onStateChange", STATE.SHUDAI_TYU);
    });

  }

  //ランダムな視標の方向を取得する ( up/left/right/down )
  randomDirection() {
    var min = 1;
    var max = 4;
    var val = Math.floor( Math.random() * (max + 1 - min) ) + min ;
    if (val == 1) return "up";
    else if (val == 2) return "left";
    else if (val == 3) return "right";
    else if (val == 4) return "down";
  }

  /**
   * 描画
   */
  render() { return (
    <table className="mondai-table" style={{ width: "400px", height: "400px"}}>
      <tr>
        <td style={{ width: "30px", height: "30px"}}></td>
        <td className={`ans-td top ${!this.canAns() && "disabled"}`} 
          onClick={this.ans.bind(this, 'up')}></td>
        <td style={{ width: "30px"}}></td>
      </tr>
      <tr>
        <td className={`ans-td left ${!this.canAns() && "disabled"}`}
        onClick={this.ans.bind(this, 'left')}></td>
        <td style={{ height: "300px"}}>
          <div className="mark-wrap">
            {this.props.sts == STATE.SHUDAI_TYU && 
            <img className={`mark ${this.state.currntDirection} lv${this.props.lvl}`} 
                 src="/static/img/mark.png"/>}
            {this.props.sts == STATE.SHUDAI_WAIT && 
            <button onClick={this.shutsuDai.bind(this)}>出題する</button>}
            {(this.props.sts == STATE.RESULT || this.props.sts == STATE.GAME_ENDING) && 
              (<div>
                <h2>
                {this.state.result == "OK" && 
                  <span>正解</span>}
                {this.state.result == "NG" && 
                  <span>不正解</span>}
                </h2>
                <div>
                  {this.props.sts != STATE.GAME_ENDING && 
                  <button onClick={this.handleNext}>次の問題</button>}
                </div>
              </div>)
            }
          </div>
        </td>
        <td className={`ans-td right ${!this.canAns() && "disabled"}`} 
            onClick={this.ans.bind(this, 'right')}></td>
      </tr>
      <tr>
        <td style={{ width: "30px", height: "30px"}}></td>
        <td className={`ans-td bottom ${!this.canAns() && "disabled"}`} 
            onClick={this.ans.bind(this, 'down')}></td>
        <td style={{ width: "30px"}}></td>
      </tr>
    </table>
  );}
}

// -------------------------------------------------------

/**
 * App コンポーネント
 * @param name 使命
 */
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date(),
      //sts: STATE.START
      sts: STATE.SHUDAI_WAIT
    };
    this.handleStateChange = this.handleStateChange.bind(this);
    this.showStartMenu = this.showStartMenu.bind(this);
  }


  //マウント
  componentDidMount() {
    EventEmitter.instance().on("onStateChange", this.handleStateChange);  
  }
  //アンマウント
  componentWillUnmount() {
    EventEmitter.instance().off("onStateChange", this.handleStateChange);
  }

  /**
   * ステータス変更イベントのハンドラ
   * @param {string} sts 
   */
  handleStateChange(sts) {
    this.setState({
      sts: sts
    }); 
  }

  /**
   * スタート画面表示
   */
  showStartMenu() {
    this.setState({
      sts: STATE.START
    }); 
  }

  /**
   * 描画
   */
  render() { return (
    <div>
      <div className="header">
        <h1>タイトル</h1>
      </div>
      <div>
        {/*スタート画面*/}
        {this.state.sts == STATE.START && 
          <StartMenu/>}
        {/*ゲーム中のタグ*/}
        {this.state.sts != STATE.START && 
          <GameWin ref="gameWin"
            onBackStart={this.showStartMenu} 
            sts={this.state.sts} />}
      </div>
    </div>
  );}
}



var m = React.render(
  <div>
    <App name="test" />
  </div>
  , document.getElementById('app'));