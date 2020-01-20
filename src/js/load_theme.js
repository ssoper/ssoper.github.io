var chooseTheme = function() {
  var places = [
    'bruges',
    'amsterdam',
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

$(function() {
  chooseTheme();
});
