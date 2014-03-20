function loadImage(url, callback) {   
    var img = new Image();   
    img.onload = function () {   
        img.onload = null;   
        callback(img);   
    }   
    img.src = url;   
}

window.onload = loadImage('img/RMB1.jpg');
window.onload = loadImage('img/RMB2.jpg');
window.onload = loadImage('img/RMB5.jpg');
window.onload = loadImage('img/RMB10.jpg');
window.onload = loadImage('img/RMB20.jpg');
window.onload = loadImage('img/RMB50.jpg');
window.onload = loadImage('img/RMB100.jpg');
window.onload = loadImage('img/RMB0.5.jpg');
window.onload = loadImage('img/RMB0.2.jpg');
window.onload = loadImage('img/RMB0.1.jpg');