$(function() {
  $('#search-button').click(function() {
    var query = $('#search-query').val().trim();
    if (query.length == 0) {
      return
    }

    window.location='https://google.com/search?q=' + encodeURIComponent(query) + '+site%3Aseansoper.com'
  })
});