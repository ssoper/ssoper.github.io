var chooseTheme = function() {
  var places = [
    'christiana',
    'carlsbad',
    'singapore',
    'potomac',
    'taipei',
    'kaohsiung'
  ];

  var place = places[Math.floor(Math.random()*places.length)];
  document.body.classList.add(place);
};

var loadDeferredStyles = function() {
  chooseTheme()
  var addStylesNode = document.getElementById('deferred-styles');
  var replacement = document.createElement('div');
  replacement.innerHTML = addStylesNode.textContent;
  document.body.appendChild(replacement)
  addStylesNode.parentElement.removeChild(addStylesNode);
};

var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
if (raf) raf(function() { window.setTimeout(loadDeferredStyles, 0); });
else window.addEventListener('load', loadDeferredStyles);

// Cheers! 🍻

var str = '';

$(document).keydown(function(evt) {
    // debug
    console.log(evt.keyCode)
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
