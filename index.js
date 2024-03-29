const path = require('path');

/*
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});*/
// Evento emitido cuando Electron ha terminado de inicializarse
  const express = require('express');
  const { createServer } = require('http');
  const cors = require('cors');
  const mineflayer = require('mineflayer');
  const { Client, Server: ServerOsc } = require('node-osc');

  const client = new Client('127.0.0.1', 9000);
  const server2 = new ServerOsc(9001, '127.0.0.1');
  server2.on('listening', () => {
    console.log('OSC Server is listening.');
  });
  const app1 = express();

  let bot;
  let botStatus = false;
  let disconnect = false;
  app1.use(cors());
  app1.use(express.json());
  app1.post('/api/receive', (req, res) => {
    const { replacedCommand } = req.body;
    if (botStatus) {
      bot.chat(replacedCommand);
    }
    //console.log('comando minecraft', replacedCommand);
  
    return res.json({ message: 'Datos recibidos' });
  });
  app1.post('/api/receive1', (req, res) => {
    const { eventType, data } = req.body;
  
    switch (eventType) {
      case 'chat':
        setTimeout(() => {
        console.log(`${data.uniqueId} : ${data.comment}`);
        sendChatMessage(`${data.uniqueId} : ${data.comment}`);
        }, 500); // antes de enviar el comando
        break;
      case 'gift':
        if (data.giftType === 1 && !data.repeatEnd) {
          console.log(`${data.uniqueId} envio ${data.giftName} x${data.repeatCount}`);
          setTimeout(() => {
            sendChatMessage(`${data.uniqueId} envio ${data.giftName} x${data.repeatCount}`);
          }, 500);
          } else if (data.repeatEnd) {
            console.log(`${data.uniqueId} envio ${data.giftName} x${data.repeatCount}`);
              // Streak ended or non-streakable gift => process the gift with final repeat_count
              sendChatMessage(`${data.uniqueId} envio ${data.giftName} x${data.repeatCount}`);
            }
        break;
      case 'social':
        if (data.displayType.includes('follow')) {
          console.log(`${data.uniqueId} te sigue`);
          sendChatMessage(`${data.uniqueId} te sigue`);
        }
        if (data.displayType.includes('share')) {
          console.log(`${data.uniqueId} ha compartido`);
          sendChatMessage(`${data.uniqueId} ha compartido`);
        }
        break;
      case 'streamEnd':
        sendChatMessage('Fin de la transmisión en vivo');
        break;
      default:
        console.log(`Evento desconocido: ${eventType}`);
    }
  
    res.json({ message: 'Datos recibidos receive1' });
  });
  app1.get('/api/create', (req, res) => {
    // Enviar un mensaje JSON por defecto como respuesta para solicitudes GET
    res.json({ message: 'Datos recibidos create' });
  });
  app1.get('/api/receive', (req, res) => {
    // Enviar un mensaje JSON por defecto como respuesta para solicitudes GET
    res.json({ message: 'Datos recibidos receive' });
  });
  app1.get('/api/disconnect', (req, res) => {
    // Enviar un mensaje JSON por defecto como respuesta para solicitudes GET
    res.json({ message: 'Datos recibidos disconnect' });
  });
  app1.post('/api/create', (req, res) => {
    const { eventType, data } = req.body;
    if (eventType === 'createBot') {
      const { keyBot, keyServer, Initcommand } = data;
      if (keyBot && keyServer) {
        if (!botStatus) {
          const serverParts = keyServer.split(':');
          const serverAddress = serverParts[0];
          const serverPort = serverParts[1] ? parseInt(serverParts[1]) : null;
  
          createBot(keyBot, serverAddress, serverPort);
          bot.once('login', () => {
            res.json({ message: 'Bot creado' });
            bot.chat(Initcommand);
          });
        } else {
          res.json({ message: 'Bot ya está conectado', botStatus });
        }
      } else if (!disconnect) {
        createBot(keyBot, keyServer);
        bot.once('login', () => {
          res.json({ message: 'Bot creado sin puerto' });
          bot.chat(Initcommand);
        });
      }
    } else if (eventType === 'disconnectBot') {
      disconnect = true;
      disconnectBot();
      res.json({ message: 'Bot desconectado' });
    } else {
      res.json({ message: 'Datos recibidos' });
    }
  });
  const overlayWindows = [];

  app1.post('/crear-overlay', (req, res) => {
    const { url, width, height } = req.body;
  
    // Configuración de la ventana de overlay con el tamaño especificado
    const overlayWindow = new BrowserWindow({
      width: parseInt(width),
      height: parseInt(height),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true
      }
    });
    overlayWindows.push(overlayWindow);

    // Cargar la URL recibida en la ventana de overlay
    overlayWindow.loadURL(url);
      //
    overlayWindow.on('focus', () => {
      overlayWindow.setIgnoreMouseEvents(false, { forward: false });
    });

    overlayWindow.on('blur', () => {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    });
    //*///
    globalShortcut.register('F11', () => {
      overlayWindows.forEach(window => window.close());
    });
  
    res.status(200).json({ message: 'Overlay creado correctamente' });
  });
  function sendChatMessage(text) {
    client.send('/chatbox/input', text, true);
  }
  
  function createBot(keyBot, keyServer, keyServerPort) {
    console.log("createBot now...");
    if (!botStatus) {
      const botOptions = {
        host: keyServer,
        username: keyBot,
      };
  
      if (keyServerPort) {
        botOptions.port = keyServerPort;
      }
  
      bot = mineflayer.createBot(botOptions);
  
      bot.on('login', () => {
        botStatus = true;
        console.log('Bot is Online');
        bot.chat('say Bot is Online');
      });
  
      bot.on('error', (err) => {
        console.log('Error:', err);
      });
  
      bot.on('end', () => {
        botStatus = false;
        if (!disconnect) {
          console.log('Connection ended, reconnecting in 3 seconds');
          if (!botStatus) {
            setTimeout(() => createBot(keyBot, keyServer, keyServerPort), 3000);
          }
        }
      });
    } else {
      console.log("No se creó el bot, estado:", botStatus);
    }
  }
  app1.post('/api/disconnect', (req, res) => {
    const { eventType } = req.body;
    if (eventType === 'disconnectBot') {
      disconnectBot();
      disconnect = true;
      res.json({ message: 'Bot desconectado' });
    } else {
      res.json({ message: 'Datos recibidos' });
    }
  });
  app1.post('/api/reconnect', (req, res) => {
    const { eventType } = req.body;
    if (eventType === 'reconnectBot') {
      reconnectBot();
      res.json({ message: 'Bot reconectado' });
    } else {
      res.json({ message: 'Datos recibidos' });
    }
  });
  function disconnectBot() {
    if (botStatus) {
      bot.quit();
      botStatus = false;
      console.log('Bot desconectado');
    }
  }


  /*
  mainWindow.on('focus', () => {
      mainWindow.setIgnoreMouseEvents(false);
  });

  mainWindow.on('blur', () => {
    if (devTool){
      return;
    }
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  });
  *///
  const httpServer = createServer(app1);
  const port = process.env.PORT || 8082;
  // Abre las herramientas de desarrollo de Electron (opcional)
  app1.use(express.static(path.join(__dirname, 'public')));

  // Evento emitido cuando   la ventana se cierra

  

  // Iniciar el servidor HTTP
  httpServer.listen(port);
  console.info(`Server running! Please visit http://localhost:${port}`);

