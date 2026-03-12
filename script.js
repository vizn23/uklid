document.addEventListener("DOMContentLoaded", () => {
  const selectors = {
    menuToggle: ["[data-menu-toggle]", ".nav-toggle", ".menu-toggle", "#menu-toggle"],
    mobileMenu: ["[data-mobile-menu]", ".nav-menu", ".mobile-menu", "#mobile-menu"],
    stickyHeader: ["[data-sticky-header]", "header.is-sticky", "header"],
    faqTriggers: [
      "[data-accordion-trigger]",
      ".faq-question",
      ".faq-item button[aria-controls]",
    ],
    contactForms: [
      'form[data-contact-form]',
      "#lead-form",
      "#contact-form",
      'form[name="contact"]',
    ],
  };

  const pickFirst = (list, root = document) =>
    list.map((selector) => root.querySelector(selector)).find(Boolean);

  const pickAll = (list, root = document) => {
    const seen = new Set();
    const nodes = [];

    list.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => {
        if (!seen.has(node)) {
          seen.add(node);
          nodes.push(node);
        }
      });
    });

    return nodes;
  };

  const menuToggle = pickFirst(selectors.menuToggle);
  const mobileMenu = pickFirst(selectors.mobileMenu);
  const stickyHeader = pickFirst(selectors.stickyHeader);
  const mobileNavMedia = window.matchMedia("(max-width: 1023px)");

  if (menuToggle && mobileMenu) {
    const setMenuState = (isOpen) => {
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      if (mobileNavMedia.matches) {
        mobileMenu.hidden = !isOpen;
        mobileMenu.classList.toggle("is-open", isOpen);
        document.body.classList.toggle("menu-open", isOpen);
      } else {
        mobileMenu.hidden = false;
        mobileMenu.classList.remove("is-open");
        document.body.classList.remove("menu-open");
      }
    };

    const syncMenuToViewport = () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenuState(isOpen && mobileNavMedia.matches);
    };

    setMenuState(false);

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen);
    });

    mobileMenu.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", () => setMenuState(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    });

    if (typeof mobileNavMedia.addEventListener === "function") {
      mobileNavMedia.addEventListener("change", syncMenuToViewport);
    } else {
      mobileNavMedia.addListener(syncMenuToViewport);
    }
  }

  const scrollToTarget = (target) => {
    const headerOffset = stickyHeader ? stickyHeader.offsetHeight : 0;
    const targetPosition =
      target.getBoundingClientRect().top + window.scrollY - headerOffset - 12;

    window.scrollTo({
      top: Math.max(targetPosition, 0),
      behavior: "smooth",
    });
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || href === "#") {
      return;
    }

    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToTarget(target);

      if (window.history.pushState) {
        window.history.pushState(null, "", href);
      }
    });
  });

  const faqTriggers = pickAll(selectors.faqTriggers);

  faqTriggers.forEach((trigger) => {
    const controlledPanelId = trigger.getAttribute("aria-controls");
    const panel =
      (controlledPanelId && document.getElementById(controlledPanelId)) ||
      trigger.closest("[data-accordion-item]")?.querySelector("[data-accordion-panel]") ||
      trigger.nextElementSibling;

    if (!panel) {
      return;
    }

    const closePanel = () => {
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      panel.classList.remove("is-open");
    };

    const openPanel = () => {
      trigger.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      panel.classList.add("is-open");
    };

    const startsOpen =
      trigger.getAttribute("aria-expanded") === "true" ||
      trigger.dataset.expanded === "true";

    if (startsOpen) {
      openPanel();
    } else {
      closePanel();
    }

    trigger.addEventListener("click", () => {
      const accordionRoot = trigger.closest("[data-accordion]");
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      if (accordionRoot && accordionRoot.hasAttribute("data-accordion-single")) {
        pickAll(selectors.faqTriggers, accordionRoot).forEach((otherTrigger) => {
          if (otherTrigger === trigger) {
            return;
          }

          const otherPanelId = otherTrigger.getAttribute("aria-controls");
          const otherPanel =
            (otherPanelId && document.getElementById(otherPanelId)) ||
            otherTrigger.closest("[data-accordion-item]")?.querySelector(
              "[data-accordion-panel]"
            ) ||
            otherTrigger.nextElementSibling;

          if (otherPanel) {
            otherTrigger.setAttribute("aria-expanded", "false");
            otherPanel.hidden = true;
            otherPanel.classList.remove("is-open");
          }
        });
      }

      if (isOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });
  });

  const showFormMessage = (form, message, type) => {
    let messageBox =
      form.querySelector("[data-form-message]") ||
      form.querySelector("#form-feedback");

    if (!messageBox) {
      messageBox = document.createElement("div");
      messageBox.setAttribute("data-form-message", "");
      form.appendChild(messageBox);
    }

    messageBox.textContent = message;
    messageBox.className = `form-feedback is-${type}`;
    messageBox.setAttribute("role", type === "error" ? "alert" : "status");
    messageBox.setAttribute("aria-live", "polite");
    messageBox.hidden = false;
  };

  const validateField = (field) => {
    const trimmedValue =
      field.type === "checkbox" ? String(field.checked) : field.value.trim();
    let error = "";

    if (field.required) {
      if (field.type === "checkbox" && !field.checked) {
        error = "Potvrďte prosím souhlas se zpracováním údajů.";
      } else if (!trimmedValue) {
        error = "Tohle pole je povinné.";
      }
    }

    if (!error && trimmedValue && field.type === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(field.value.trim())) {
        error = "Zadejte prosím platný e-mail.";
      }
    }

    if (!error && trimmedValue && /phone|telefon/i.test(field.name)) {
      const digits = field.value.replace(/\D/g, "");
      if (digits.length < 9) {
        error = "Telefon musí mít alespoň 9 číslic.";
      }
    }

    if (!error && trimmedValue && field.name === "message" && field.value.trim().length < 10) {
      error = "Zpráva by měla být konkrétnější.";
    }

    field.setCustomValidity(error);
    field.classList.toggle("input-error", Boolean(error));

    if (error) {
      field.setAttribute("aria-invalid", "true");
    } else {
      field.removeAttribute("aria-invalid");
    }

    return !error;
  };

  pickAll(selectors.contactForms).forEach((form) => {
    const fields = Array.from(
      form.querySelectorAll("input, select, textarea")
    ).filter((field) => field.type !== "hidden" && field.type !== "submit");

    fields.forEach((field) => {
      field.addEventListener("input", () => validateField(field));
      field.addEventListener("blur", () => validateField(field));
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const honeypot =
        form.querySelector("[data-honeypot]") ||
        form.querySelector('input[name="company"]') ||
        form.querySelector('input[name="website"]');

      if (honeypot && honeypot.value.trim() !== "") {
        form.reset();
        showFormMessage(
          form,
          "Děkuji, zpráva byla přijata.",
          "success"
        );
        return;
      }

      let firstInvalidField = null;

      fields.forEach((field) => {
        const isValid = validateField(field);
        if (!isValid && !firstInvalidField) {
          firstInvalidField = field;
        }
      });

      if (firstInvalidField) {
        firstInvalidField.focus();
        showFormMessage(
          form,
          "Zkontrolujte prosím povinná pole a zkuste to znovu.",
          "error"
        );
        return;
      }

      form.reset();
      fields.forEach((field) => {
        field.removeAttribute("aria-invalid");
        field.classList.remove("input-error");
      });
      showFormMessage(
        form,
        "Děkujeme. Nezávazná poptávka je připravena k odeslání a ozveme se co nejdříve.",
        "success"
      );
    });
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = [
    ".intro-grid",
    ".service-card",
    ".pricing-card",
    ".step-card",
    ".about-grid",
    ".testimonial-card",
    ".coverage-grid",
    ".faq-item",
    ".contact-copy",
    ".contact-form",
    ".contact-card",
    ".price-list",
  ];

  const revealNodes = pickAll(revealTargets);

  revealNodes.forEach((node, index) => {
    node.classList.add("reveal-on-scroll");
    node.style.setProperty("--delay", `${Math.min(index * 45, 260)}ms`);
  });

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealNodes.forEach((node) => revealObserver.observe(node));
});
