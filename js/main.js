// Keep the footer year current.
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
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
  const zoomInButton = viewer.querySelector(".viewer-zoom-in");
  const zoomOutButton = viewer.querySelector(".viewer-zoom-out");
  const resetButton = viewer.querySelector(".viewer-reset");
  let zoom = 1;
  let fitScale = 1;
  let focusedImageButton = null;
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

  document.querySelectorAll(".image-open").forEach((button) => {
    button.addEventListener("click", () => {
      const image = button.querySelector("img");
      focusedImageButton = button;
      zoom = 1;
      viewerImage.src = image.currentSrc || image.src;
      viewerImage.alt = image.alt;
      viewerViewport.scrollTo(0, 0);
      viewer.showModal();
      fitImage();
    });
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
    focusedImageButton?.focus();
  });
  window.addEventListener("resize", () => {
    if (viewer.open) {
      fitImage();
    }
  });
  viewerImage.addEventListener("load", fitImage);
}
