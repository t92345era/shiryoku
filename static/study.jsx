/**
 * CountUp コンポーネント
 * @param name 使命
 */
class CountUp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cnt: 0
    };
    //this.countUp = this.countUp.bind(this);
  }

  countUp() {
    this.setState((prevState, props) => ({
      cnt: prevState.cnt + 1
    }));
  }

  /**
   * 描画処理
   */
  render() { 

    let fin = null;
    if (this.state.cnt >= 5) {
      fin = <div>FIN 5</div>
    }
    
    return (
    <div>
      <div><button onClick={this.countUp.bind(this)}>click</button></div>
      <div>cnt= {this.state.cnt}</div>
      {fin}
      {this.state.cnt >= 10 && <div>FIN 10</div>}
      {this.state.cnt % 2 == 0 ? (
        <div>偶数</div>
      ) : (
        <div>奇数</div>
      )}
    </div>
  );}
}


/**
 * リストサンプル
 */
class ListSample extends React.Component {
 constructor(props) {
   super(props);
   this.state = {
     dataSource: ['1', '2']
   };
   
 }

 /**
  * レンダリング
  */
 render() {

  return ( 
    <ul>
      {this.state.dataSource.map((value, index) => 
        <li key={value} data-value={value}>{value}</li>
      )}
    </ul>
  );
 }

}


/**
 * フォームサンプル
 * @param userName
 * @
 */
class FormSample extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      userName: "",
      memo: ""
    };

    this.handleChange2 = this.handleChange2.bind(this);
  }

  /**
   * フォーム入力内容変更時の処理
   * @param {event} e 
   */
  handleChange2(e) {
    //console.log("handleChange() name=" + name + " value=" + value);
    this.setState({
      [e.target.name]: e.target.value
    });
    // return true;
  }
 
  /**
   * レンダリング
   */
  render() {
 
   return ( 
    <form>
      <div>
        <label>name: <input type="text" 
          name="userName"
          value={this.state.userName}
          onChange={this.handleChange2} /></label>
      </div>
      <div>input: {this.state.userName}</div>
   </form>
   );
  }
 }



 var test = "red";
 const html = (
  <div style={{color:test}}>dffdfdf</div>
  
  );