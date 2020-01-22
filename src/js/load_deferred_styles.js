var isDarkMode = function() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }

  return false;
}

var loadDeferredStyles = function() { 
  var addStylesNode = document.getElementById('deferred-styles');
  var textContent = addStylesNode.textContent

  if (isDarkMode) {
    textContent = textContent.replace("build/styles/default.min.css", "build/styles/androidstudio.min.css")
  }

  var replacement = document.createElement('div');
  replacement.innerHTML = textContent;
  document.body.appendChild(replacement)
  addStylesNode.parentElement.removeChild(addStylesNode);
};

var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
if (raf) raf(function() { window.setTimeout(loadDeferredStyles, 0); });
else window.addEventListener('load', loadDeferredStyles);