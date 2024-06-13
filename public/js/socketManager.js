// socketManager.js
const SocketManager = (function() {
    let socket;
  
    function connect() {
      if (!socket) {
        socket = io.connect('http://localhost:3000');
      }
      return socket;
    }
  
    function getSocket() {
      return socket;
    }
  
    return {
      connect: connect,
      getSocket: getSocket
    };
  })();
  
  export default SocketManager;
  