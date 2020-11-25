(function(document) {
  let image = new Image();

  image.onload = function() {
    document.body.classList.add('webp');
  }
  
  image.onerror = function() {
    document.body.classList.add('jpg');
  }
  
  image.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';  
})(document);
