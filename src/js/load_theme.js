(function(document) {
  let image = new Image();

  image.onload = function() {
    document.body.classList.add('webp');
  }

  image.onerror = function() {
    document.body.classList.add('jpg');
  }

  image.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';

  let places = [
    'bruges',
    'amsterdam',
    'christiana',
    'carlsbad',
    'singapore',
    'potomac',
    'taipei',
    'kaohsiung',
    'sunflower',
    'natural_bridge',
    'dulles',
    'corolla',
    'koh_phangan',
    'cicada'
  ];

  // Don’t forget to add to theme.css
  // Use the `cwebp` command to convert JPG to WebP
  let place = places[Math.floor(Math.random()*places.length)];
  document.body.classList.add(place);
})(document);
