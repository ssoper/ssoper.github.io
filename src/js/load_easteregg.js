// Cheers! 🍻

var str = '';

$(document).keydown(function(evt) {
    // debug
    // console.log(evt.keyCode)
    if (evt.keyCode === 27) {
        str = '';
    }
});

$(document).keypress(function(evt) {
    str += evt.keyCode;

    if (str === '98101101114') {
        $('#untappd').removeAttr('class');
    }
});
