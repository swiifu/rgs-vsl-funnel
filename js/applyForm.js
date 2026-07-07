/* =========================================================
   APPLY FORM — a self-built, Typeform-style one-question-at-a-
   time flow. Same component is used two places:
     1. Inline, mounted into #apply-form-inline at the bottom
        of the page.
     2. In a centered modal, opened by any a[href="#apply"].
   Answers are POSTed as JSON to a GoHighLevel "Inbound Webhook"
   workflow trigger (set the URL in RGS_CONFIG.ghl.webhookUrl in
   script.js) instead of Typeform.

   Partial-lead capture: every completed step fires a best-effort
   POST with whatever's been collected so far (form_status:
   "partial"), and leaving the page mid-fill (tab hidden / unload)
   sends one last beacon that also grabs the currently-typed,
   not-yet-validated field. All hits from one form fill share a
   session_id so the same GHL workflow/webhook can correlate
   partial vs. complete submissions for the same person.
========================================================= */

import intlTelInput from "intl-tel-input";
import "intl-tel-input/styles";

const FIELDS = [
  {
    key: "fullName",
    label: "What's your full name?",
    type: "text",
    placeholder: "Jane Doe",
    autocomplete: "name",
    validate: (v) => (v.trim().length >= 2 ? null : "Please enter your full name."),
  },
  {
    key: "phone",
    label: "What's the best phone number to reach you?",
    type: "tel",
    autocomplete: "tel",
    validate: (v) =>
      /^[0-9+\-\s().]{7,20}$/.test(v.trim()) ? null : "Please enter a valid phone number.",
  },
  {
    key: "instagram",
    label: "What's your Instagram @?",
    type: "text",
    placeholder: "@yourhandle",
    autocomplete: "off",
    validate: (v) => (v.trim().length >= 2 ? null : "Please enter your Instagram handle."),
  },
  {
    key: "email",
    label: "Last one — what's your best email?",
    type: "email",
    placeholder: "you@example.com",
    autocomplete: "email",
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Please enter a valid email."),
  },
];

/**
 * Best-effort initial country for the phone field's country picker: tries an
 * IP geolocation lookup first, then falls back to the browser's locale
 * region, then to the US. Whatever this resolves to is only the *starting*
 * flag — intl-tel-input still auto-detects the country from a typed "+"
 * dial code on top of it.
 */
async function detectCountry() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.country_code) return data.country_code.toLowerCase();
    }
  } catch (_) {
    /* fall through to locale-based guess */
  }
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region) return region.toLowerCase();
  } catch (_) {
    /* fall through to default */
  }
  return "us";
}

function isConfigured(webhookUrl) {
  return Boolean(webhookUrl) && webhookUrl !== "YOUR_GHL_WEBHOOK_URL";
}

function buildPayload(values, { status, lastStepCompleted, sessionId }) {
  return {
    session_id: sessionId,
    form_status: status, // "partial" | "complete"
    last_step_completed: lastStepCompleted || null,
    full_name: (values.fullName || "").trim(),
    phone: (values.phone || "").trim(),
    instagram: (values.instagram || "").trim().replace(/^@/, ""),
    email: (values.email || "").trim(),
    source: "website_apply_form",
    submitted_at: new Date().toISOString(),
  };
}

async function submitToGHL(webhookUrl, payload) {
  if (!isConfigured(webhookUrl)) {
    throw new Error("GHL webhook URL is not configured (RGS_CONFIG.ghl.webhookUrl).");
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`GHL webhook responded with ${res.status}`);
  }
}

/**
 * Best-effort partial-lead capture — never blocks or surfaces errors to the
 * user. Deliberately plain fetch, no `keepalive`/`sendBeacon`: both force
 * the request's credentials mode to "include", which GHL's webhook (it
 * responds with a wildcard Access-Control-Allow-Origin: *) rejects outright.
 * Trade-off: on a hard tab-close mid-request this can get cut short, but
 * that's rare next to the common cases (modal close, step advance) where
 * the page stays alive long enough for a plain fetch to complete.
 */
function sendPartial(webhookUrl, payload) {
  if (!isConfigured(webhookUrl)) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function makeSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let uid = 0;

function createStepForm({ webhookUrl, onDone } = {}) {
  const formId = `apply-form-${uid++}`;
  const state = {
    step: 0,
    values: {},
    submitting: false,
    submitted: false,
    sessionId: makeSessionId(),
    currentInput: null,
    lastPartialSignature: null,
  };

  const root = document.createElement("div");
  root.className = "apply-form";

  const progress = document.createElement("div");
  progress.className = "apply-form-progress";
  const progressBar = document.createElement("div");
  progressBar.className = "apply-form-progress-bar";
  progress.appendChild(progressBar);

  const body = document.createElement("div");
  body.className = "apply-form-body";

  root.append(progress, body);

  function updateProgress() {
    const pct = state.submitted ? 100 : ((state.step + 1) / (FIELDS.length + 1)) * 100;
    progressBar.style.width = `${pct}%`;
  }

  function renderQuestion() {
    if (state.phoneIti) {
      state.phoneIti.destroy();
      state.phoneIti = null;
    }

    const field = FIELDS[state.step];
    const questionId = `${formId}-q${state.step}`;

    body.innerHTML = "";
    body.classList.remove("is-entering");

    const counter = document.createElement("div");
    counter.className = "apply-form-counter";
    counter.textContent = `${state.step + 1} / ${FIELDS.length}`;

    const question = document.createElement("label");
    question.className = "apply-form-question";
    question.id = questionId;
    question.htmlFor = `${questionId}-input`;
    question.textContent = field.label;

    const input = document.createElement("input");
    input.className = "apply-form-input";
    input.id = `${questionId}-input`;
    input.type = field.type;
    if (field.type !== "tel") input.placeholder = field.placeholder;
    input.autocomplete = field.autocomplete;
    input.value = state.values[field.key] || "";
    input.setAttribute("aria-labelledby", questionId);
    state.currentInput = input;

    const error = document.createElement("div");
    error.className = "apply-form-error";

    const nav = document.createElement("div");
    nav.className = "apply-form-nav";

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "apply-form-back";
    backBtn.textContent = "Back";
    backBtn.style.visibility = state.step === 0 ? "hidden" : "visible";
    backBtn.addEventListener("click", () => {
      state.step = Math.max(0, state.step - 1);
      updateProgress();
      renderQuestion();
    });

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn btn-primary apply-form-next";
    nextBtn.textContent = state.step === FIELDS.length - 1 ? "Submit" : "OK";

    const hint = document.createElement("span");
    hint.className = "apply-form-hint";
    hint.textContent = "press Enter ↵";

    async function attemptAdvance() {
      let value = input.value;
      let msg;

      if (field.type === "tel" && state.phoneIti) {
        const phoneIti = state.phoneIti;
        if (!input.value.trim()) {
          msg = "Please enter your phone number.";
        } else {
          try {
            await phoneIti.promise;
          } catch (_) {
            /* utils or geo lookup failed to load — fall back below */
          }
          if (intlTelInput.utils) {
            msg = phoneIti.isValidNumberPrecise() ? null : "Please enter a valid phone number.";
            if (!msg) value = phoneIti.getNumber();
          } else {
            msg = field.validate(input.value);
          }
        }
      } else {
        msg = field.validate(input.value);
      }

      if (msg) {
        error.textContent = msg;
        input.classList.add("has-error");
        input.focus({ preventScroll: true });
        return;
      }
      error.textContent = "";
      input.classList.remove("has-error");
      state.values[field.key] = value;

      if (state.step < FIELDS.length - 1) {
        sendPartial(
          webhookUrl,
          buildPayload(state.values, {
            status: "partial",
            lastStepCompleted: field.key,
            sessionId: state.sessionId,
          })
        );
        state.step += 1;
        updateProgress();
        renderQuestion();
      } else {
        submit();
      }
    }

    nextBtn.addEventListener("click", attemptAdvance);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        attemptAdvance();
      }
    });
    input.addEventListener("input", () => {
      if (input.classList.contains("has-error")) {
        error.textContent = "";
        input.classList.remove("has-error");
      }
    });

    nav.append(backBtn, nextBtn, hint);
    body.append(counter, question, input, error, nav);

    if (field.type === "tel") {
      state.phoneIti = intlTelInput(input, {
        initialCountry: "",
        initialCountryLookup: detectCountry,
        loadUtils: () => import("intl-tel-input/utils"),
        separateDialCode: false,
        containerClass: "apply-form-tel",
      });
    }

    requestAnimationFrame(() => {
      body.classList.add("is-entering");
      input.focus({ preventScroll: true });
    });
  }

  function renderSubmitting() {
    state.currentInput = null;
    body.innerHTML = "";
    const spinner = document.createElement("div");
    spinner.className = "apply-form-spinner";
    const text = document.createElement("p");
    text.className = "apply-form-status-text";
    text.textContent = "Submitting your application…";
    body.append(spinner, text);
  }

  function renderError(message) {
    body.innerHTML = "";
    const text = document.createElement("p");
    text.className = "apply-form-status-text apply-form-status-error";
    text.textContent = message;

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "btn btn-primary apply-form-next";
    retryBtn.textContent = "Try Again";
    retryBtn.addEventListener("click", submit);

    body.append(text, retryBtn);
  }

  function renderSuccess() {
    state.submitted = true;
    updateProgress();
    body.innerHTML = "";

    const check = document.createElement("div");
    check.className = "apply-form-success-check";
    check.innerHTML =
      '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

    const heading = document.createElement("p");
    heading.className = "apply-form-status-text";
    heading.textContent = "You're in! We'll be in touch shortly.";

    body.append(check, heading);

    if (onDone) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "btn btn-primary apply-form-next";
      closeBtn.textContent = "Close";
      closeBtn.addEventListener("click", onDone);
      body.append(closeBtn);
    }
  }

  async function submit() {
    if (state.submitting) return;
    state.submitting = true;
    renderSubmitting();

    const payload = buildPayload(state.values, {
      status: "complete",
      lastStepCompleted: FIELDS[FIELDS.length - 1].key,
      sessionId: state.sessionId,
    });

    try {
      await submitToGHL(webhookUrl, payload);
      state.submitting = false;
      renderSuccess();
    } catch (err) {
      state.submitting = false;
      console.error("Apply form submission failed:", err);
      renderError("Something went wrong submitting your application. Please try again.");
    }
  }

  /** Fires once, best-effort, when the user leaves mid-fill (tab hidden / page unload). */
  function captureAbandon() {
    if (state.submitted || state.submitting) return;

    const values = { ...state.values };
    const inFlightField = FIELDS[state.step];
    const inFlightValue = state.currentInput ? state.currentInput.value.trim() : "";
    if (inFlightField && inFlightValue) {
      values[inFlightField.key] = inFlightValue;
    }

    const hasAnyData = Object.values(values).some((v) => v && String(v).trim());
    if (!hasAnyData) return;

    const signature = JSON.stringify(values);
    if (signature === state.lastPartialSignature) return;
    state.lastPartialSignature = signature;

    sendPartial(
      webhookUrl,
      buildPayload(values, {
        status: "partial",
        lastStepCompleted: FIELDS[Math.max(state.step - 1, 0)]?.key,
        sessionId: state.sessionId,
      })
    );
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") captureAbandon();
  });
  window.addEventListener("pagehide", captureAbandon);

  function reset() {
    state.step = 0;
    state.values = {};
    state.submitting = false;
    state.submitted = false;
    state.sessionId = makeSessionId();
    state.lastPartialSignature = null;
    updateProgress();
    renderQuestion();
  }

  reset();

  return { el: root, reset, captureAbandon };
}

function createModal(stepFormEl, { onClose } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "apply-modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "apply-modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Application form");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "apply-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close");

  dialog.append(closeBtn, stepFormEl);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  function open() {
    overlay.classList.add("is-open");
    document.body.classList.add("apply-modal-open");
  }
  function close() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("apply-modal-open");
    onClose?.();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });

  return { open, close };
}

/**
 * Wires up the inline apply form (if #apply-form-inline exists) and
 * intercepts every a[href="#apply"] to open a centered modal version
 * instead of jumping to the section.
 * @param {{ webhookUrl: string }} options
 */
export function initApplyForm({ webhookUrl } = {}) {
  const inlineMount = document.getElementById("apply-form-inline");
  if (inlineMount) {
    const inlineForm = createStepForm({ webhookUrl });
    inlineMount.appendChild(inlineForm.el);
  }

  const triggers = document.querySelectorAll('a[href="#apply"]');
  if (!triggers.length) return;

  let modal = null;
  let modalForm = null;

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();

      if (!modal) {
        modalForm = createStepForm({ webhookUrl, onDone: () => modal.close() });
        modal = createModal(modalForm.el, { onClose: () => modalForm.captureAbandon() });
      } else {
        modalForm.reset();
      }
      modal.open();
    });
  });
}
