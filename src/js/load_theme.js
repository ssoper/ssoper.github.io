$(function() {
  var places = [
    'bruges',
    'amsterdam',
    'christiana',
    'carlsbad',
    'singapore',
    'potomac',
    'taipei',
    'kaohsiung',
    'sunflower',
    'natural_bridge'
  ];

  // Don’t forget to add to theme.css
  var place = places[Math.floor(Math.random()*places.length)];
  document.body.classList.add(place);
});
