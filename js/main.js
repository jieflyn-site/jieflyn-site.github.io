const ORDER_TELEGRAM_URL = "https://t.me/JiefLyn";
const COMMERCIAL_LICENSE_RATE = 0.5; // Считаем +50% от работы с надбавками и срочностью; базу можно уточнить.

// Keep the footer year current.
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const orderSection = document.getElementById("zakaz");
if (orderSection) {
  const tabs = [...orderSection.querySelectorAll('[role="tab"]')];
  const routeTab = new Map([
    ["zakaz", tabs[0]],
    ["zakaz-how", tabs[1]],
    ["zakaz-process", tabs[2]],
    ["zakaz-rights", tabs[3]]
  ]);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function activateTab(tab, { focus = false, updateHash = false, scroll = false } = {}) {
    tabs.forEach((currentTab) => {
      const selected = currentTab === tab;
      currentTab.setAttribute("aria-selected", String(selected));
      currentTab.tabIndex = selected ? 0 : -1;
      document.getElementById(currentTab.getAttribute("aria-controls")).hidden = !selected;
    });

    if (updateHash && window.location.hash !== tab.hash) {
      window.history.pushState(null, "", tab.hash);
    }
    if (focus) {
      tab.focus();
    }
    if (scroll) {
      document.getElementById(tab.getAttribute("aria-controls")).scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      activateTab(tab, { updateHash: true, scroll: true });
    });
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (index + tabs.length - 1) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      activateTab(tabs[nextIndex], { focus: true, updateHash: true });
    });
  });

  function activateFromHash() {
    const tab = routeTab.get(window.location.hash.slice(1)) || tabs[0];
    activateTab(tab);
  }
  window.addEventListener("hashchange", activateFromHash);
  activateFromHash();

  orderSection.querySelectorAll(".jl-panel details").forEach((disclosure) => {
    const summary = disclosure.querySelector("summary");
    summary.setAttribute("aria-expanded", String(disclosure.open));
    disclosure.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", String(disclosure.open));
    });
  });

  orderSection.querySelectorAll(".jl-order-link").forEach((link) => {
    link.href = ORDER_TELEGRAM_URL;
  });

  const formatSelect = document.getElementById("jl-format");
  const rushSelect = document.getElementById("jl-rush");
  const totalOutput = document.getElementById("jl-total");
  const breakdown = document.getElementById("jl-breakdown");
  const deadlineOutput = document.getElementById("jl-deadline");
  const calculatorStatus = document.getElementById("jl-calc-status");
  const numberFormat = new Intl.NumberFormat("ru-RU");
  const rubles = (amount) => `${numberFormat.format(amount)} ₽`;
  const complexityInputs = [...orderSection.querySelectorAll(".jl-fieldset input[data-extra]")];
  const groupInput = orderSection.querySelector("[data-group]");
  const personInputs = [...orderSection.querySelectorAll("[data-person]")];

  function updateCalculator() {
    const selectedFormat = formatSelect.selectedOptions[0];
    const selectedRush = rushSelect.selectedOptions[0];
    const basePrice = Number(selectedFormat.value);
    const workLines = [{ label: selectedFormat.textContent.split(" — ")[0], amount: basePrice }];
    let complexityTotal = 0;
    let addedDays = 0;

    complexityInputs.forEach((input) => {
      if (input.checked && !(groupInput.checked && input.dataset.person !== undefined)) {
        const label = input.closest("label").childNodes[1].textContent.trim();
        const amount = Number(input.dataset.extra);
        const days = Number(input.dataset.days);
        complexityTotal += amount;
        addedDays += days;
        workLines.push({ label, amount });
      }
    });

    const workTotal = basePrice + complexityTotal;
    const rushRate = Number(selectedRush.value) / 100;
    const rushAmount = Math.round(workTotal * rushRate);
    const sourceAmount = document.getElementById("jl-sources").checked ? 1500 : 0;
    const licenseBase = workTotal + rushAmount;
    const licenseAmount = document.getElementById("jl-license").checked
      ? Math.round(licenseBase * COMMERCIAL_LICENSE_RATE)
      : 0;
    const total = workTotal + rushAmount + sourceAmount + licenseAmount;

    const rows = [...workLines];
    rows.push({ label: "Работа с надбавками", amount: workTotal, total: true });
    if (rushAmount) {
      rows.push({ label: `Срочность +${selectedRush.value}%`, amount: rushAmount });
    }
    if (sourceAmount) {
      rows.push({ label: "Исходники (PSD, слои)", amount: sourceAmount });
    }
    if (licenseAmount) {
      rows.push({ label: "Коммерческая лицензия (+50%)", amount: licenseAmount });
    }

    breakdown.replaceChildren(...rows.map((row) => {
      const element = document.createElement("div");
      element.className = `jl-breakdown-row${row.total ? " jl-breakdown-total" : ""}`;
      const label = document.createElement("span");
      label.textContent = row.label;
      const amount = document.createElement("span");
      amount.textContent = rubles(row.amount);
      element.append(label, amount);
      return element;
    }));
    totalOutput.textContent = rubles(total);

    const rushRange = selectedRush.dataset.range;
    const dayLabel = (days) => {
      const lastTwo = days % 100;
      const last = days % 10;
      if (lastTwo >= 11 && lastTwo <= 14) {
        return "дней";
      }
      if (last === 1) {
        return "день";
      }
      return last >= 2 && last <= 4 ? "дня" : "дней";
    };
    const addedDaysText = addedDays
      ? ` · надбавки к сложности: +${addedDays} ${dayLabel(addedDays)}`
      : "";
    if (rushRange === "format") {
      deadlineOutput.textContent = `Срок по формату: ${selectedFormat.dataset.duration}${addedDaysText}`;
    } else {
      deadlineOutput.textContent = `Срок по формату: ${selectedFormat.dataset.duration} · ускорение: ${selectedRush.dataset.duration}${addedDaysText}`;
    }

    calculatorStatus.textContent = "";
    return {
      lines: rows,
      total,
      deadline: deadlineOutput.textContent
    };
  }

  groupInput.addEventListener("change", () => {
    personInputs.forEach((input) => {
      if (groupInput.checked) {
        input.checked = false;
      }
      input.disabled = groupInput.checked;
    });
    updateCalculator();
  });
  [...complexityInputs, formatSelect, rushSelect, document.getElementById("jl-sources"), document.getElementById("jl-license")]
    .forEach((input) => input.addEventListener("change", updateCalculator));
  updateCalculator();

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    const temporaryField = document.createElement("textarea");
    temporaryField.value = text;
    temporaryField.setAttribute("readonly", "");
    temporaryField.style.position = "fixed";
    temporaryField.style.opacity = "0";
    document.body.append(temporaryField);
    temporaryField.select();
    const copied = document.execCommand("copy");
    temporaryField.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error("Копирование не поддерживается браузером."));
  }

  const copyTemplateButton = document.getElementById("jl-copy-template");
  const templateStatus = document.getElementById("jl-template-status");
  copyTemplateButton.addEventListener("click", () => {
    copyText(document.getElementById("jl-template").textContent)
      .then(() => {
        templateStatus.textContent = "Скопировано";
      })
      .catch(() => {
        templateStatus.textContent = "Не удалось скопировать. Выделите шаблон и скопируйте его вручную.";
      });
  });

  document.getElementById("jl-copy-calc").addEventListener("click", () => {
    const { lines, total, deadline } = updateCalculator();
    const calculationText = [
      "Расчёт заказа",
      ...lines.map((line) => `${line.label}: ${rubles(line.amount)}`),
      deadline,
      `Итого: ${rubles(total)}`,
      "Ориентировочно, точную цену называю после обсуждения."
    ].join("\n");
    window.open(ORDER_TELEGRAM_URL, "_blank", "noopener,noreferrer");
    copyText(calculationText)
      .then(() => {
        calculatorStatus.textContent = "Расчёт скопирован. Открылся Telegram.";
      })
      .catch(() => {
        calculatorStatus.textContent = "Telegram открыт, но расчёт не скопирован. Скопируйте сумму вручную.";
      });
  });

  orderSection.querySelectorAll(".jl-order-steps button").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      orderSection.querySelectorAll(".jl-order-steps button").forEach((stepButton) => {
        stepButton.setAttribute("aria-expanded", "false");
        stepButton.querySelector(".jl-step-description").hidden = true;
      });
      button.setAttribute("aria-expanded", String(!expanded));
      button.querySelector(".jl-step-description").hidden = expanded;
    });
  });

  orderSection.querySelectorAll(".jl-add-revision").forEach((button) => {
    let revisionCount = 0;
    const reviewCard = button.closest(".jl-review-card");
    const countOutput = reviewCard.querySelector(".jl-revision-count");
    button.addEventListener("click", () => {
      revisionCount += 1;
      const freeRemaining = Math.max(0, 2 - revisionCount);
      const paidCount = Math.max(0, revisionCount - 2);
      countOutput.innerHTML = `Бесплатно осталось: <b>${freeRemaining}</b>. Дополнительных: <b>${paidCount}</b> — ${rubles(paidCount * 500)}.`;
      countOutput.setAttribute("aria-live", "polite");
    });
  });

  const topButton = orderSection.querySelector(".jl-top");
  const updateTopButton = () => {
    const bounds = orderSection.getBoundingClientRect();
    const orderSectionVisible = bounds.top < window.innerHeight && bounds.bottom > 0;
    topButton.classList.toggle("jl-visible", window.scrollY > 650 && orderSectionVisible);
  };
  window.addEventListener("scroll", updateTopButton, { passive: true });
  window.addEventListener("resize", updateTopButton);
  updateTopButton();

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("jl-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 })
    : null;
  if (revealObserver) {
    orderSection.querySelectorAll(".jl-panel > *, .jl-panel article, .jl-panel details")
      .forEach((element) => {
        element.classList.add("jl-reveal");
        revealObserver.observe(element);
      });
  }
}

const aboutDetails = document.querySelector(".about-details");
const aboutMark = aboutDetails?.querySelector(".about-mark");
if (aboutDetails && aboutMark) {
  const updateAboutLineGaps = () => {
    const detailsTop = aboutDetails.getBoundingClientRect().top;
    const markBounds = aboutMark.getBoundingClientRect();
    aboutDetails.style.setProperty("--about-mark-top", `${markBounds.top - detailsTop}px`);
    aboutDetails.style.setProperty("--about-mark-bottom", `${markBounds.bottom - detailsTop}px`);
  };
  const aboutLineObserver = new ResizeObserver(updateAboutLineGaps);
  aboutLineObserver.observe(aboutDetails);
  aboutLineObserver.observe(aboutMark);
  updateAboutLineGaps();
}

const stickerTrack = document.querySelector(".sticker-track");
const stickerGroup = stickerTrack?.querySelector(".sticker-group");
if (stickerTrack && stickerGroup) {
  const duplicateGroup = stickerGroup.cloneNode(true);
  duplicateGroup.setAttribute("aria-hidden", "true");
  duplicateGroup.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    button.tabIndex = -1;
  });
  stickerTrack.append(duplicateGroup);
}

const gallery = document.querySelector(".gallery-pages");
if (gallery) {
  const scrollAreas = [...gallery.querySelectorAll(".gallery-scroll-area")];

  function updateScrollState(area) {
    const controls = area.parentElement.querySelector(".gallery-scroll-controls");
    const scrollDownButton = controls.querySelector(".gallery-scroll-down");
    const scrollUpButton = controls.querySelector(".gallery-scroll-up");
    const canScrollUp = area.scrollTop > 2;
    const atBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 2;
    const canScrollDown = area.scrollHeight > area.clientHeight + 2 && !atBottom;
    scrollDownButton.hidden = !canScrollDown;
    scrollUpButton.hidden = !canScrollUp;
  }

  function layoutGallery(grid) {
    const cards = [...grid.querySelectorAll(".gallery-card")];
    const columnCount = 3;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const columnWidth = (grid.clientWidth - gap * (columnCount - 1)) / columnCount;
    if (columnWidth <= 0) {
      return;
    }

    const columnHeights = Array(columnCount).fill(0);
    cards.forEach((card) => {
      const column = columnHeights.indexOf(Math.min(...columnHeights));
      card.style.width = `${columnWidth}px`;
      card.style.left = `${column * (columnWidth + gap)}px`;
      card.style.top = `${columnHeights[column]}px`;
      columnHeights[column] += card.getBoundingClientRect().height + gap;
    });
    grid.style.height = `${Math.max(...columnHeights) - gap}px`;
  }

  scrollAreas.forEach((area) => {
    const controls = area.parentElement.querySelector(".gallery-scroll-controls");
    const scrollDownButton = controls.querySelector(".gallery-scroll-down");
    const scrollUpButton = controls.querySelector(".gallery-scroll-up");
    const grid = area.querySelector(".gallery-grid");

    area.addEventListener("scroll", () => updateScrollState(area), { passive: true });
    scrollDownButton.addEventListener("click", () => {
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    });
    scrollUpButton.addEventListener("click", () => {
      area.scrollTo({ top: 0, behavior: "smooth" });
    });
    new ResizeObserver(() => {
      layoutGallery(grid);
      updateScrollState(area);
    }).observe(area);
    grid.querySelectorAll("img").forEach((image) => {
      image.addEventListener("load", () => {
        layoutGallery(grid);
        updateScrollState(area);
      });
    });
    layoutGallery(grid);
    updateScrollState(area);
  });
}

const viewer = document.querySelector(".image-viewer");
if (viewer) {
  const viewerImage = viewer.querySelector(".viewer-image");
  const viewerViewport = viewer.querySelector(".viewer-viewport");
  const previousButton = viewer.querySelector(".viewer-prev");
  const nextButton = viewer.querySelector(".viewer-next");
  const zoomInButton = viewer.querySelector(".viewer-zoom-in");
  const zoomOutButton = viewer.querySelector(".viewer-zoom-out");
  const resetButton = viewer.querySelector(".viewer-reset");
  let imageButtons = [];
  let zoom = 1;
  let fitScale = 1;
  let focusedImageButton = null;
  let currentImageIndex = -1;
  let panStart = null;

  function setZoom(value) {
    zoom = Math.min(4, Math.max(1, value));
    const width = viewerImage.naturalWidth * fitScale * zoom;
    const height = viewerImage.naturalHeight * fitScale * zoom;
    viewerImage.style.width = `${width}px`;
    viewerImage.style.height = `${height}px`;
    viewerImage.classList.toggle("is-zoomed", zoom > 1);
    viewerViewport.style.cursor = zoom > 1 ? "grab" : "zoom-in";
  }

  function fitImage() {
    if (!viewerImage.naturalWidth || !viewerImage.naturalHeight) {
      return;
    }
    fitScale = Math.min(
      viewerViewport.clientWidth / viewerImage.naturalWidth,
      viewerViewport.clientHeight / viewerImage.naturalHeight,
      1
    );
    setZoom(zoom);
  }

  function showImage(index) {
    currentImageIndex = index;
    const button = imageButtons[index];
    const image = button.querySelector("img");
    zoom = 1;
    viewerImage.style.width = "auto";
    viewerImage.style.height = "auto";
    viewerImage.classList.remove("is-zoomed");
    viewerViewport.style.cursor = "zoom-in";
    viewerViewport.scrollTo(0, 0);
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt;
    previousButton.disabled = index === 0;
    nextButton.disabled = index === imageButtons.length - 1;
    if (viewerImage.complete && viewerImage.naturalWidth) {
      fitImage();
    }
  }

  function navigateImage(direction) {
    const nextIndex = currentImageIndex + direction;
    if (nextIndex >= 0 && nextIndex < imageButtons.length) {
      showImage(nextIndex);
    }
  }

  document.querySelectorAll(".image-open").forEach((button) => {
    if (!button.querySelector("img")) {
      return;
    }
    button.addEventListener("click", () => {
      const group = button.closest(".gallery-pages, .sticker-track, .invitation-grid");
      imageButtons = [...(group || button.parentElement).querySelectorAll(".image-open")]
        .filter((imageButton) => !imageButton.disabled && imageButton.querySelector("img"));
      if (!group) {
        imageButtons = [button];
      }
      focusedImageButton = button;
      showImage(imageButtons.indexOf(button));
      viewer.showModal();
    });
  });

  previousButton.addEventListener("click", () => {
    navigateImage(-1);
  });
  nextButton.addEventListener("click", () => {
    navigateImage(1);
  });
  document.addEventListener("keydown", (event) => {
    if (viewer.open && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      navigateImage(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  zoomInButton.addEventListener("click", () => setZoom(zoom + 0.5));
  zoomOutButton.addEventListener("click", () => setZoom(zoom - 0.5));
  resetButton.addEventListener("click", () => {
    zoom = 1;
    fitImage();
    viewerViewport.scrollTo(0, 0);
  });
  viewer.querySelector(".viewer-close").addEventListener("click", () => viewer.close());
  viewerImage.addEventListener("click", () => setZoom(zoom > 1 ? 1 : 2));
  viewerViewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
  }, { passive: false });
  viewerViewport.addEventListener("pointerdown", (event) => {
    if (zoom === 1 || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }
    event.preventDefault();
    panStart = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewerViewport.scrollLeft,
      scrollTop: viewerViewport.scrollTop
    };
    viewerViewport.setPointerCapture(event.pointerId);
    viewerViewport.style.cursor = "grabbing";
  });
  viewerViewport.addEventListener("pointermove", (event) => {
    if (!panStart) {
      return;
    }
    viewerViewport.scrollLeft = panStart.scrollLeft + panStart.x - event.clientX;
    viewerViewport.scrollTop = panStart.scrollTop + panStart.y - event.clientY;
  });
  viewerViewport.addEventListener("pointerup", () => {
    panStart = null;
    viewerViewport.style.cursor = zoom > 1 ? "grab" : "zoom-in";
  });
  viewerViewport.addEventListener("pointercancel", () => {
    panStart = null;
    viewerViewport.style.cursor = zoom > 1 ? "grab" : "zoom-in";
  });
  viewerImage.addEventListener("dragstart", (event) => event.preventDefault());
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) {
      viewer.close();
    }
  });
  viewer.addEventListener("close", () => {
    viewerImage.removeAttribute("src");
    currentImageIndex = -1;
    focusedImageButton?.focus();
  });
  window.addEventListener("resize", () => {
    if (viewer.open) {
      fitImage();
    }
  });
  viewerImage.addEventListener("load", fitImage);
}
