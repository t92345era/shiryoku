class EventEmitter {
  constructor() {
      this._handlers = {};
  }

  static instance() {
    if (typeof EventEmitter._instance === "undefined") {
      EventEmitter._instance =  new EventEmitter();
    }
    return EventEmitter._instance;
  }

  on(type, handler) {
      if (typeof this._handlers[type] === 'undefined') {
          this._handlers[type] = [];
      }
      this._handlers[type].push(handler);
  }
  off(type, handler) {
      if (typeof this._handlers[type] === 'undefined') {
          return;
      }
      var index = this._handlers[type].indexOf(handler);
      if (index >= 0) 
        this._handlers[type].splice( index, 1 );
  }
  emit(type, data) {
      var handlers = this._handlers[type] || [];
      for (var i = 0; i < handlers.length; i++) {
          var handler = handlers[i];
          handler.call(this, data);
      }
  }
}