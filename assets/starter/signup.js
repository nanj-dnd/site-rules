// Contact form. Submissions go to the inbox in the form's data-endpoint via
// FormSubmit (https://formsubmit.co): no account, no backend. The first ever
// submission sends that inbox an activation email that someone must click.
(function () {
  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    var note = form.querySelector('.form-note');
    var button = form.querySelector('button[type="submit"]');
    var endpoint = 'https://formsubmit.co/ajax/' + form.getAttribute('data-endpoint');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements._honey && form.elements._honey.value) return; // bot
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var email = form.elements.email.value.trim();
      var data = {
        name: form.elements.name.value.trim(),
        email: email,
        company: form.elements.company ? form.elements.company.value.trim() : '',
        message: form.elements.message ? form.elements.message.value.trim() : '',
        page: location.href,
        _subject: 'New enquiry from ' + location.hostname,
        _template: 'table',
        _replyto: email
      };

      button.disabled = true;
      note.textContent = 'Sending…';
      note.className = 'form-note';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || String(res.j.success) !== 'true') throw new Error(res.j.message || 'failed');
          form.classList.add('sent');
          note.textContent = 'Thanks, ' + (data.name.split(' ')[0] || 'we got it') + ". We'll be in touch at " + email + '.';
          note.className = 'form-note ok';
        })
        .catch(function () {
          var to = form.getAttribute('data-endpoint');
          button.disabled = false;
          note.innerHTML = 'Something went wrong. Please email <a href="mailto:' + to + '">' + to + '</a> instead.';
          note.className = 'form-note err';
        });
    });
  });
})();
