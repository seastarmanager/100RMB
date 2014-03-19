function loadImage(url, callback) {   
    var img = new Image();   
    img.onload = function () {   
        img.onload = null;   
        callback(img);   
    }   
    img.src = url;   
}

window.onload = function() {
	loadImage('img/RMB1.jpg');
	loadImage('img/RMB2.jpg');
	loadImage('img/RMB5.jpg');
	loadImage('img/RMB10.jpg');
	loadImage('img/RMB20.jpg');
	loadImage('img/RMB50.jpg');
	loadImage('img/RMB100.jpg');
} 