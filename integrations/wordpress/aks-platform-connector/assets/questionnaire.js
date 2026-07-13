(function () {
  "use strict";

  var config = window.AKSQuestionnaire || {};
  var root = document.querySelector("[data-aks-questionnaire]");
  var context;
  var step = 0;
  var prepared = null;
  var submitting = false;
  var touched = {};
  var requestId = "HQ-WP-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  if (!root || !config.restUrl || !config.nonce) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }

  function api(action, payload) {
    return fetch(config.restUrl + action, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": config.nonce },
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok || !body.ok) {
          throw new Error(body.message || (body.error && body.error.message) ||
            "Le questionnaire santé est temporairement indisponible.");
        }
        return body.data;
      });
    });
  }

  function months() {
    return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
      "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
      .map(function (name, index) {
        var value = String(index + 1).padStart(2, "0");
        return '<option value="' + value + '">' + name + "</option>";
      }).join("");
  }

  function questionMarkup() {
    var number = 0;
    return context.questionnaire.sections.map(function (section, sectionIndex) {
      var questions = section.questions.map(function (question) {
        number += 1;
        return '<fieldset class="aks-hq__question" data-question="' + escapeHtml(question.id) + '">' +
          '<legend><small>Question ' + number + " sur " + context.questionnaire.questions.length +
          "</small>" + escapeHtml(question.label) + "</legend>" +
          '<div class="aks-hq__answers"><label><input type="radio" name="answer_' +
          escapeHtml(question.id) + '" value="YES"><span>Oui</span></label>' +
          '<label><input type="radio" name="answer_' + escapeHtml(question.id) +
          '" value="NO"><span>Non</span></label></div></fieldset>';
      }).join("");
      return '<section class="aks-hq__section"><p>Partie ' + (sectionIndex + 1) + " sur " +
        context.questionnaire.sections.length + "</p><h3>" + escapeHtml(section.title) +
        "</h3>" + questions + "</section>";
    }).join("");
  }

  function render() {
    var flow = context.flow.map(function (item, index) {
      return '<li class="' + (index === 0 ? "is-active" : "") +
        '" data-progress="' + index + '"><span>' + (index + 1) + "</span>" +
        escapeHtml(item.label) + "</li>";
    }).join("");

    root.innerHTML = '<article class="aks-hq__card"><header class="aks-hq__header">' +
      '<p class="aks-hq__official">Questionnaire officiel</p>' +
      '<h2>Questionnaire relatif à l’état de santé du sportif mineur</h2>' +
      '<p class="aks-hq__campaign">' + escapeHtml(context.campaign.name) + "</p>" +
      '<ol class="aks-hq__steps">' + flow + '</ol><p class="aks-hq__step-label"></p></header>' +
      '<form class="aks-hq__body" novalidate><div class="aks-hq__error" role="alert" tabindex="-1"></div>' +
      identityMarkup() + questionsMarkup() + declarationMarkup() + confirmationMarkup() +
      "</form></article>";
    bind();
    showStep(0);
  }

  function identityMarkup() {
    return '<section class="aks-hq__step" data-step="identity"><aside class="aks-hq__info">' +
      '<strong>🔒 Confidentialité des réponses</strong><p>Vos réponses servent uniquement à déterminer si un certificat médical est nécessaire. Elles ne sont ni conservées par AKS Platform, ni communiquées au club.</p></aside>' +
      '<h3>Informations du mineur</h3><p>Tous les champs sont obligatoires.</p><div class="aks-hq__grid">' +
      field("email", "Adresse mail", "email", "email") + field("lastName", "Nom", "text", "family-name") +
      field("firstName", "Prénom", "text", "given-name") +
      '<fieldset data-field="birthDate"><legend>Date de naissance</legend><div class="aks-hq__birth">' +
      '<label>Jour<input id="birthDateDay" inputmode="numeric" maxlength="2" placeholder="JJ"></label>' +
      '<label>Mois<select id="birthDateMonth"><option value="">Mois</option>' + months() + "</select></label>" +
      '<label>Année<input id="birthDateYear" inputmode="numeric" maxlength="4" placeholder="AAAA"></label></div>' +
      '<p class="aks-hq__field-error" data-error="birthDate" aria-live="polite"></p></fieldset>' +
      '<fieldset data-field="sex"><legend>Sexe</legend><div class="aks-hq__choices"><label><input type="radio" name="sex" value="FEMALE"> Féminin</label>' +
      '<label><input type="radio" name="sex" value="MALE"> Masculin</label></div>' +
      '<p class="aks-hq__field-error" data-error="sex" aria-live="polite"></p></fieldset></div>' +
      '<h3>Personne exerçant l’autorité parentale</h3><div class="aks-hq__grid">' +
      field("legalRepresentativeLastName", "Nom", "text", "family-name") +
      field("legalRepresentativeFirstName", "Prénom", "text", "given-name") +
      '</div><div class="aks-hq__actions"><button type="button" data-next disabled aria-disabled="true">Continuer</button></div></section>';
  }

  function field(id, label, type, autocomplete) {
    return '<label class="aks-hq__field" data-field="' + id + '">' + label + '<input id="' + id + '" type="' + type +
      '" autocomplete="' + autocomplete + '" required aria-describedby="' + id + '-error">' +
      '<span id="' + id + '-error" class="aks-hq__field-error" data-error="' + id + '" aria-live="polite"></span></label>';
  }

  function questionsMarkup() {
    return '<section class="aks-hq__step" data-step="questions" hidden><p class="aks-hq__official">' +
      escapeHtml(context.questionnaire.reference) + " (" + escapeHtml(context.questionnaire.article) +
      ')</p><h3>' + escapeHtml(context.questionnaire.officialTitle) + '</h3><div class="aks-hq__notice">' +
      escapeHtml(context.questionnaire.parentWarning) + '</div><p>' +
      escapeHtml(context.questionnaire.childIntroduction) + "</p>" + questionMarkup() +
      '<div class="aks-hq__notice"><strong>En cas de réponse Oui</strong><p>' +
      escapeHtml(context.questionnaire.positiveAnswerInstruction) + '</p></div><div class="aks-hq__actions">' +
      '<button type="button" class="secondary" data-back>Retour</button><button type="button" data-prepare disabled aria-disabled="true">Continuer</button></div></section>';
  }

  function declarationMarkup() {
    return '<section class="aks-hq__step" data-step="declaration" hidden><p class="aks-hq__official">Déclaration sur l’honneur</p>' +
      '<h3>Confirmation de la personne exerçant l’autorité parentale</h3><div class="aks-hq__notice">Je confirme avoir complété conjointement avec mon enfant l’ensemble du questionnaire et certifie sur l’honneur l’exactitude des informations communiquées.</div>' +
      '<dl class="aks-hq__summary"><dt>Sportif mineur</dt><dd data-minor></dd><dt>Personne exerçant l’autorité parentale</dt><dd data-representative></dd></dl>' +
      '<label class="aks-hq__consent"><input type="checkbox" data-consent> Je confirme sur l’honneur avoir complété ce questionnaire conjointement avec mon enfant.</label>' +
      '<div class="aks-hq__actions"><button type="button" class="secondary" data-back>Retour</button><button type="button" data-submit disabled aria-disabled="true">Valider et transmettre</button></div></section>';
  }

  function confirmationMarkup() {
    return '<section class="aks-hq__step" data-step="confirmation" hidden><p class="aks-hq__official">Transmission terminée</p>' +
      '<h3>Votre questionnaire a été enregistré</h3><div class="aks-hq__confirmation"><small>Référence du dossier</small><strong data-reference></strong><p data-result></p></div>' +
      '<div class="aks-hq__info"><strong>✉️ Consultez votre messagerie</strong><p>Un e-mail récapitulatif vient d’être envoyé. Pensez à vérifier votre dossier Courriers indésirables ou Spam.</p></div>' +
      '<p>Les réponses au questionnaire ne sont pas conservées. Conservez la référence pour tout échange avec le club.</p></section>';
  }

  function value(id) { return root.querySelector("#" + id).value.trim(); }
  function identity() {
    var sex = root.querySelector('input[name="sex"]:checked');
    return { email: value("email"), lastName: value("lastName"), firstName: value("firstName"),
      birthDate: value("birthDateYear") + "-" + value("birthDateMonth") + "-" + value("birthDateDay").padStart(2, "0"),
      sex: sex ? sex.value : "", legalRepresentativeLastName: value("legalRepresentativeLastName"),
      legalRepresentativeFirstName: value("legalRepresentativeFirstName") };
  }
  function answers() {
    var result = {};
    context.questionnaire.questions.forEach(function (q) {
      var input = root.querySelector('input[name="answer_' + CSS.escape(q.id) + '"]:checked');
      if (input) result[q.id] = input.value;
    });
    return result;
  }
  function error(message) {
    var box = root.querySelector(".aks-hq__error");
    box.textContent = message; box.classList.add("is-visible"); box.focus();
  }
  function clearError() { root.querySelector(".aks-hq__error").classList.remove("is-visible"); }
  function showStep(index) {
    step = index; clearError();
    root.querySelectorAll("[data-step]").forEach(function (el, i) { el.hidden = i !== index; });
    root.querySelectorAll("[data-progress]").forEach(function (el, i) {
      el.classList.toggle("is-active", i === index); el.classList.toggle("is-done", i < index);
    });
    root.querySelector(".aks-hq__step-label").textContent = "Étape " + (index + 1) + " sur 4 — " + context.flow[index].label;
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function setFieldError(name, message, visible) {
    var output = root.querySelector('[data-error="' + name + '"]');
    var container = root.querySelector('[data-field="' + name + '"]');
    if (output) output.textContent = visible ? message : "";
    if (container) container.classList.toggle("is-invalid", visible && !!message);
  }
  function validateIdentity(showAll) {
    var data = identity();
    var date = new Date(data.birthDate + "T00:00:00");
    var parts = data.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var today = new Date();
    var age = today.getFullYear() - date.getFullYear();
    if (today < new Date(today.getFullYear(), date.getMonth(), date.getDate())) age -= 1;
    var exactDate = parts && date.getFullYear() === Number(parts[1]) &&
      date.getMonth() === Number(parts[2]) - 1 && date.getDate() === Number(parts[3]);
    var errors = {};
    if (!data.email) errors.email = "Veuillez renseigner votre adresse e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Veuillez saisir une adresse e-mail valide.";
    [["lastName", data.lastName, "nom du mineur"], ["firstName", data.firstName, "prénom du mineur"],
      ["legalRepresentativeLastName", data.legalRepresentativeLastName, "nom de la personne exerçant l’autorité parentale"],
      ["legalRepresentativeFirstName", data.legalRepresentativeFirstName, "prénom de la personne exerçant l’autorité parentale"]]
      .forEach(function (item) {
        if (!item[1]) errors[item[0]] = "Veuillez renseigner le " + item[2] + ".";
        else if (item[1].length < 2) errors[item[0]] = "Ce champ doit contenir au moins 2 caractères.";
      });
    if (!value("birthDateDay") || !value("birthDateMonth") || !value("birthDateYear")) errors.birthDate = "Veuillez renseigner la date de naissance complète.";
    else if (!exactDate || age < 0) errors.birthDate = "Veuillez saisir une date de naissance valide.";
    else if (age >= 18) errors.birthDate = "Ce questionnaire est réservé aux sportifs mineurs.";
    if (!data.sex) errors.sex = "Veuillez sélectionner le sexe du mineur.";
    ["email", "lastName", "firstName", "birthDate", "sex", "legalRepresentativeLastName", "legalRepresentativeFirstName"]
      .forEach(function (name) { setFieldError(name, errors[name] || "", showAll || touched[name]); });
    var valid = Object.keys(errors).length === 0;
    var next = root.querySelector("[data-next]");
    next.disabled = !valid; next.setAttribute("aria-disabled", String(!valid));
    return valid;
  }
  function bind() {
    root.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); });
    var identityStep = root.querySelector('[data-step="identity"]');
    identityStep.addEventListener("input", function (event) {
      if (event.target.id === "birthDateDay" || event.target.id === "birthDateYear") event.target.value = event.target.value.replace(/\D/g, "");
      validateIdentity(false);
    });
    identityStep.addEventListener("change", function (event) {
      touched[event.target.name || (event.target.id.indexOf("birthDate") === 0 ? "birthDate" : event.target.id)] = true;
      if (event.target.name === "sex") touched.sex = true;
      validateIdentity(false);
    });
    identityStep.addEventListener("focusout", function (event) {
      touched[event.target.id.indexOf("birthDate") === 0 ? "birthDate" : event.target.id] = true;
      validateIdentity(false);
    });
    root.querySelector("[data-next]").addEventListener("click", function () {
      if (!validateIdentity(true)) return error("Certaines informations sont incomplètes ou invalides.");
      showStep(1);
    });
    root.querySelectorAll("[data-back]").forEach(function (button) {
      button.addEventListener("click", function () { showStep(step - 1); });
    });
    root.querySelector("[data-prepare]").addEventListener("click", function (event) {
      if (Object.keys(answers()).length !== context.questionnaire.questions.length) return error("Veuillez répondre à toutes les questions.");
      event.target.disabled = true;
      api("prepare", { answers: answers() }).then(function (data) {
        prepared = data;
        var dataIdentity = identity();
        root.querySelector("[data-minor]").textContent = dataIdentity.firstName + " " + dataIdentity.lastName;
        root.querySelector("[data-representative]").textContent = dataIdentity.legalRepresentativeFirstName + " " + dataIdentity.legalRepresentativeLastName;
        showStep(2);
      }).catch(function (e) { error(e.message); }).finally(function () { event.target.disabled = false; });
    });
    root.querySelector('[data-step="questions"]').addEventListener("change", function () {
      var complete = Object.keys(answers()).length === context.questionnaire.questions.length;
      var button = root.querySelector("[data-prepare]");
      button.disabled = !complete; button.setAttribute("aria-disabled", String(!complete));
    });
    root.querySelector("[data-consent]").addEventListener("change", function (event) {
      var button = root.querySelector("[data-submit]");
      button.disabled = !event.target.checked; button.setAttribute("aria-disabled", String(!event.target.checked));
    });
    root.querySelector("[data-submit]").addEventListener("click", function (event) {
      if (submitting || !prepared || !root.querySelector("[data-consent]").checked) return error("Vous devez confirmer la déclaration avant de continuer.");
      submitting = true; event.target.disabled = true; event.target.textContent = "Transmission…";
      var dataIdentity = identity();
      api("submit", { requestId: requestId, identity: dataIdentity, answers: answers(), declaration: {
        legalRepresentativeName: dataIdentity.legalRepresentativeFirstName + " " + dataIdentity.legalRepresentativeLastName, accepted: true
      }}).then(function (data) {
        root.querySelector("[data-reference]").textContent = data.submissionId;
        root.querySelector("[data-result]").textContent = data.result === "MEDICAL_CERTIFICATE_REQUIRED" ?
          "Un certificat médical devra être remis au club." : "Aucun certificat médical n’est requis.";
        root.querySelectorAll('.aks-hq__question input').forEach(function (input) { input.checked = false; });
        prepared = null; showStep(3);
      }).catch(function (e) { submitting = false; event.target.disabled = false; event.target.textContent = "Valider et transmettre"; error(e.message); });
    });
    validateIdentity(false);
  }

  api("context", {}).then(function (data) {
    if (!data || !data.available) throw new Error("Aucune campagne de questionnaire n’est disponible.");
    context = data; render();
  }).catch(function (e) {
    root.innerHTML = '<div class="aks-hq__fatal" role="alert"><h2>Questionnaire indisponible</h2><p>' + escapeHtml(e.message) + "</p></div>";
  });
})();
