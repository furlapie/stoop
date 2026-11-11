(function () {
  var root = document.getElementById('pos');
  if (!root) return;

  var d = root.dataset;
  var price = parseFloat(d.price);
  var size = null;
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel) { return root.querySelectorAll(sel); };

  var track = $('hero-track');
  var dots = root.querySelectorAll('.hero-dots .dot');
  var prev = $('hero-prev'), nextImg = $('hero-next');
  var count = track ? track.children.length : 0;

  function cur() { return Math.round(track.scrollLeft / track.clientWidth); }

  function goTo(i) {
    i = Math.max(0, Math.min(count - 1, i));
    var target = i * track.clientWidth;
    var start = track.scrollLeft;
    if (Math.abs(target - start) < 2) return;
    var prevSnap = track.style.scrollSnapType;
    track.style.scrollSnapType = 'none';
    var t0 = performance.now();
    var DUR = 480;
    function step(now) {
      var p = Math.min(1, (now - t0) / DUR);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      track.scrollLeft = start + (target - start) * e;
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        track.style.scrollSnapType = prevSnap || '';
      }
    }
    requestAnimationFrame(step);
  }

  function sync() {
    var i = cur();
    dots.forEach(function (dot, idx) { dot.classList.toggle('on', idx === i); });
    if (prev) prev.disabled = i <= 0;
    if (nextImg) nextImg.disabled = i >= count - 1;
  }

  if (track && count > 1) {
    track.addEventListener('scroll', sync, { passive: true });
    if (prev) prev.addEventListener('click', function () { goTo(cur() - 1); });
    if (nextImg) nextImg.addEventListener('click', function () { goTo(cur() + 1); });
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () { goTo(parseInt(dot.dataset.i, 10)); });
    });
    document.addEventListener('keydown', function (e) {
      var pay = $('step-pay');
      if (pay && !pay.hidden) return;
      if (e.key === 'ArrowLeft') goTo(cur() - 1);
      if (e.key === 'ArrowRight') goTo(cur() + 1);
    });
    sync();
  }

  all('.size').forEach(function (b) {
    b.addEventListener('click', function () {
      all('.size').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      size = b.dataset.size;
      var n = $('next');
      if (n) n.disabled = false;
    });
  });

  var nextBtn = $('next');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var sizeLabel = size === 'OneSize' ? 'UNICA' : size;
      $('step-size').hidden = true;
      $('step-pay').hidden = false;
      $('summary').textContent =
        d.name + ' · ' + sizeLabel + ' · € ' + price.toFixed(2).replace('.', ',');
      $('qr').innerHTML = '';
      $('qr-note').textContent = '';
      all('.method').forEach(function (x) { x.classList.remove('on'); });
    });
  }

  var backBtn = $('back');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      $('step-pay').hidden = true;
      $('step-size').hidden = false;
    });
  }

  function linkFor(method) {
    if (method === 'paypal') {
      return 'https://paypal.me/' + d.paypal + '/' + price.toFixed(2) + d.currency;
    }
    var url = 'https://revolut.me/' + d.revolut;
    if (d.revolutPrefill === 'true') {
      url += '?amount=' + Math.round(price * 100) + '&currency=' + d.currency;
    }
    return url;
  }

  all('.method').forEach(function (b) {
    b.addEventListener('click', function () {
      all('.method').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');

      var qr = qrcode(0, 'M');
      qr.addData(linkFor(b.dataset.method));
      qr.make();
      $('qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });

      $('qr-note').textContent = b.dataset.method === 'paypal'
        ? 'Importo già inserito. Controlla la notifica prima di consegnare.'
        : 'Di al cliente di inviare € ' + price.toFixed(2).replace('.', ',') + '. Controlla la notifica.';
    });
  });
})();