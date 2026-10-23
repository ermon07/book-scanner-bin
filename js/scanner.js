/* Barcode scanning: live camera and image files, powered by html5-qrcode. */
(function () {
  "use strict";

  var camera = null;
  var cameraRunning = false;
  var fileScanner = null;

  function formats() {
    var F = window.Html5QrcodeSupportedFormats || {};
    return [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128].filter(function (value) {
      return value !== undefined && value !== null;
    });
  }

  function library() {
    var QR = window.Html5Qrcode;
    if (!QR) throw new Error("The barcode scanner library did not load.");
    return QR;
  }

  function isSecureContext() {
    return !!window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
  }

  async function pickCamera(QR) {
    try {
      var cameras = await QR.getCameras();
      if (cameras && cameras.length) {
        var rear = cameras.find(function (item) {
          return /back|rear|environment|wide/i.test(item.label || "");
        });
        return { deviceId: { exact: (rear || cameras[0]).id } };
      }
    } catch (error) {
      /* permission errors surface from start() instead */
    }
    return { facingMode: { ideal: "environment" } };
  }

  async function start(elementId, onDetect) {
    var QR = library();
    await stop();

    var config = await pickCamera(QR);
    camera = new QR(elementId, {
      verbose: false,
      formatsToSupport: formats(),
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    });

    var scanConfig = {
      fps: 12,
      qrbox: function (width, height) {
        var w = Math.min(360, Math.floor(width * 0.82));
        var h = Math.min(200, Math.floor(height * 0.5));
        return { width: Math.max(160, w), height: Math.max(110, h) };
      },
      disableFlip: true
    };

    await camera.start(
      config,
      scanConfig,
      function (decoded) {
        if (cameraRunning && decoded) onDetect(decoded);
      },
      function () { /* per-frame misses are expected */ }
    );
    cameraRunning = true;
  }

  async function stop() {
    var instance = camera;
    camera = null;
    cameraRunning = false;
    if (!instance) return;
    try {
      await instance.stop();
    } catch (error) {
      /* already stopped */
    }
    try {
      instance.clear();
    } catch (error) {
      /* ignore */
    }
  }

  async function scanFile(file, elementId) {
    var QR = library();
    clearFilePreview(elementId);

    fileScanner = new QR(elementId, {
      verbose: false,
      formatsToSupport: formats(),
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    });

    try {
      var decoded = await fileScanner.scanFile(file, true);
      return decoded;
    } catch (error) {
      throw error;
    }
  }

  function clearFilePreview(elementId) {
    if (fileScanner) {
      try { fileScanner.clear(); } catch (error) { /* ignore */ }
      fileScanner = null;
    }
    var el = elementId ? document.getElementById(elementId) : null;
    if (el) el.innerHTML = "";
  }

  function feedback() {
    if (navigator.vibrate) {
      try { navigator.vibrate(60); } catch (error) { /* ignore */ }
    }
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      setTimeout(function () { ctx.close(); }, 350);
    } catch (error) {
      /* audio is a nicety */
    }
  }

  window.StacksScanner = {
    start: start,
    stop: stop,
    scanFile: scanFile,
    clearFilePreview: clearFilePreview,
    feedback: feedback,
    isSecureContext: isSecureContext
  };
})();
