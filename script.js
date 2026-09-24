(() => {
  const section = document.querySelector(".cinema-scroll");
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const track = document.querySelector(".sights-track");
  const sightsControls = document.querySelector(".sights-controls");
  const sightPrev = document.querySelector(".sight-prev");
  const sightNext = document.querySelector(".sight-next");
  const originalCards = Array.from(document.querySelectorAll(".sights-track .sight-card"));

  if (!section || !root) return;

  // State (Section 7)
  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetScroll = 0;
  let smoothScroll = 0;
  let initialized = false;
  let rafPending = false;
  let sightCards = [];
  let originalSightCount = originalCards.length || 5;
  let activeSight = originalSightCount;

  // Helpers (Section 7)
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const smoothstep = (e0, e1, v) => {
    const x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const segmentInOut = (s, a, b, c, d) => {
    const enter = smoothstep(a, b, s);
    const exit = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  };
  const getScrollDistance = () => {
    return clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);
  };

  // Infinite Slider Logic (Section 8)
  function setupSightSlider() {
    if (!track || !originalCards.length) return;
    originalSightCount = originalCards.length;
    track.replaceChildren();

    // 3 identical sets = 15 cards
    for (let setIndex = 0; setIndex < 3; setIndex++) {
      originalCards.forEach((card, cardIndex) => {
        const clone = card.cloneNode(true);
        const idx = setIndex * originalSightCount + cardIndex;
        clone.dataset.sightIndex = idx.toString();
        clone.setAttribute("tabindex", "0");
        clone.setAttribute("role", "button");

        clone.addEventListener("click", () => selectSightCard(clone));
        clone.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectSightCard(clone);
          }
        });
        track.appendChild(clone);
      });
    }

    sightCards = Array.from(track.querySelectorAll(".sight-card"));
    activeSight = originalSightCount; // Start in middle set
    track.addEventListener("transitionend", normalizeSightSlider);
    updateSightSlider();
  }

  function updateSightSlider() {
    if (!sightCards.length || !track) return;
    const cardWidth = sightCards[0].offsetWidth;
    const computedTrack = window.getComputedStyle(track);
    const gap = parseFloat(computedTrack.columnGap || computedTrack.gap || "0");
    root.style.setProperty("--sights-shift", `${(-(cardWidth + gap) * activeSight).toFixed(2)}px`);

    sightCards.forEach((c) => {
      const idx = Number(c.dataset.sightIndex);
      c.classList.toggle("is-active", idx === activeSight);
    });
  }

  function moveSightSlider(dir) {
    activeSight += dir;
    updateSightSlider();
  }

  function selectSightCard(card) {
    const idx = Number(card.dataset.sightIndex);
    if (Number.isFinite(idx)) {
      activeSight = idx;
      updateSightSlider();
    }
  }

  function jumpSightSlider(i) {
    if (!track) return;
    track.classList.add("is-jumping");
    activeSight = i;
    updateSightSlider();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.classList.remove("is-jumping");
      });
    });
  }

  function normalizeSightSlider() {
    if (activeSight >= originalSightCount * 2) {
      jumpSightSlider(activeSight - originalSightCount);
    } else if (activeSight < originalSightCount) {
      jumpSightSlider(activeSight + originalSightCount);
    }
  }

  // Animation Engine (Section 7)
  function update() {
    rafPending = false;
    targetScroll = getScrollDistance();

    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
    }

    if (Math.abs(smoothScroll - targetScroll) < 0.08) {
      smoothScroll = targetScroll;
    }

    mouseX = lerp(mouseX, targetMouseX, 0.12);
    mouseY = lerp(mouseY, targetMouseY, 0.12);

    const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
    const progress = clamp(smoothScroll / 2700);
    const introExit = smoothstep(90, 650, smoothScroll);
    const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
    const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
    const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
    const blurActive = clamp(frame2.active + frame3.active);
    const frame2Opacity = frame2.active * (1 - frame3.enter);
    const splitDrift = Math.pow(frame2.enter, 1.5);
    const panel2Opacity = frame2.active * (1 - frame2.exit);
    const panel3Opacity = frame3.active * (1 - frame3.exit);
    const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    const sharedHeroY = progress * -74;
    const sharedHeroScale = progress * 0.23;
    const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

    // Verbatim variable writes
    root.style.setProperty("--mx", (reduceMotion.matches ? 0 : mouseX).toFixed(4));
    root.style.setProperty("--my", (reduceMotion.matches ? 0 : mouseY).toFixed(4));

    root.style.setProperty("--back-opacity", (1 - frame2.active * 0.06).toFixed(4));
    root.style.setProperty("--back-x", `${(mouseX * -12).toFixed(2)}px`);
    root.style.setProperty("--back-y", `${(mouseY * -4).toFixed(2)}px`);
    root.style.setProperty("--back-scale", backScale.toFixed(4));
    root.style.setProperty("--four-y", `${(10 + progress * 10).toFixed(2)}vh`);
    root.style.setProperty("--four-scale", (0.78 + progress * 0.16).toFixed(4));
    root.style.setProperty("--bazaar-y", `${(20 - progress * 8).toFixed(2)}vh`);
    root.style.setProperty("--blur-px", `${(blurActive * 14).toFixed(2)}px`);
    root.style.setProperty("--back-brightness", (1 - blurActive * 0.255).toFixed(4));
    root.style.setProperty("--bazaar-blur-px", `${(frame2.active * 14).toFixed(2)}px`);
    root.style.setProperty("--bazaar-brightness", (1 - frame2.active * 0.255 - frame3.active * 0.06).toFixed(4));
    root.style.setProperty("--bazaar-saturation", (1 + frame3.active * 0.18).toFixed(4));
    root.style.setProperty("--shade-opacity", "1");
    root.style.setProperty("--shade-z", frame2.active > 0.02 ? "2" : "0");
    root.style.setProperty("--shade-top-alpha", (blurActive * 0.465).toFixed(4));
    root.style.setProperty("--shade-mid-alpha", (blurActive * 0.42).toFixed(4));
    root.style.setProperty("--shade-bottom-alpha", (blurActive * 0.51).toFixed(4));

    root.style.setProperty("--title-y", `${(introExit * -210).toFixed(2)}px`);
    root.style.setProperty("--title-scale", (1 - introExit * 0.08).toFixed(4));
    root.style.setProperty("--title-opacity", (1 - introExit).toFixed(4));

    root.style.setProperty("--bridge-x", `calc(-50% + ${(mouseX * 18).toFixed(2)}px)`);
    root.style.setProperty("--bridge-y", `${(mouseY * 8 + sharedHeroY - frame2.exit * 760).toFixed(2)}px`);
    root.style.setProperty("--bridge-bottom", `${(5 - frame2.enter * 13).toFixed(2)}vh`);
    root.style.setProperty("--bridge-width", `${(67.2 + frame2.enter * 37.8).toFixed(2)}vw`);
    root.style.setProperty("--bridge-scale", (1.02 + sharedHeroScale + frame2.exit * 0.46).toFixed(4));

    root.style.setProperty("--split-left-x", `calc(-50% + ${(-splitDrift * 46).toFixed(2)}vw + ${(mouseX * 22).toFixed(2)}px)`);
    root.style.setProperty("--split-left-y", `${(mouseY * 10 + sharedHeroY - splitDrift * 180).toFixed(2)}px`);
    root.style.setProperty("--split-left-scale", (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
    root.style.setProperty("--split-right-x", `calc(-50% + ${(splitDrift * 46).toFixed(2)}vw + ${(mouseX * 22).toFixed(2)}px)`);
    root.style.setProperty("--split-right-y", `${(mouseY * 10 + sharedHeroY - splitDrift * 180).toFixed(2)}px`);
    root.style.setProperty("--split-right-scale", (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));

    root.style.setProperty("--frame2-opacity", frame2Opacity.toFixed(4));
    root.style.setProperty("--frame2-x", `calc(-50% + ${(mouseX * 10).toFixed(2)}px)`);
    root.style.setProperty("--frame2-y", `calc(-50% + ${(mouseY * 8 - frame2.exit * 150).toFixed(2)}px)`);
    root.style.setProperty("--frame2-scale", (1.06 + frame2.enter * 0.08 + frame2.exit * 0.08).toFixed(4));

    root.style.setProperty("--intro-copy-y", `${(introExit * 90).toFixed(2)}px`);
    root.style.setProperty("--intro-copy-opacity", (1 - introExit).toFixed(4));
    root.style.setProperty("--panel2-opacity", panel2Opacity.toFixed(4));
    root.style.setProperty("--panel2-y", `calc(-50% + ${(-frame2.exit * 86 + (1 - frame2.enter) * 58).toFixed(2)}px)`);
    root.style.setProperty("--panel3-opacity", panel3Opacity.toFixed(4));
    root.style.setProperty("--panel3-y", `calc(-50% + ${(-frame3.exit * 86 + (1 - frame3.enter) * 58).toFixed(2)}px)`);

    root.style.setProperty("--sights-opacity", sightsEnter.toFixed(4));
    root.style.setProperty("--sights-controls-opacity", sightsControlsEnter.toFixed(4));
    if (sightsControls) {
      sightsControls.classList.toggle("is-ready", sightsControlsEnter > 0.98);
    }
    root.style.setProperty("--sights-visibility", sightsEnter > 0.01 ? "visible" : "hidden");
    root.style.setProperty("--sights-y", "0px");
    root.style.setProperty("--sights-enter-x", `${((1 - sightsEnter) * 420).toFixed(2)}vw`);
    root.style.setProperty("--sights-scale", (1 / backScale).toFixed(4));
    root.style.setProperty("--sights-top", `${sightsParentTop.toFixed(2)}px`);
    root.style.setProperty("--sights-screen-top", `${sightsScreenTop.toFixed(2)}px`);

    // Re-request frame if moving
    const needsScrollRaf = Math.abs(smoothScroll - targetScroll) > 0.08;
    const needsMouseXRaf = Math.abs(mouseX - targetMouseX) > 0.001;
    const needsMouseYRaf = Math.abs(mouseY - targetMouseY) > 0.001;

    if (needsScrollRaf || needsMouseXRaf || needsMouseYRaf) {
      requestTick();
    }
  }

  function requestTick() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(update);
    }
  }

  // Event Listeners
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", () => {
    updateSightSlider();
    requestTick();
  });
  window.addEventListener(
    "pointermove",
    (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
      requestTick();
    },
    { passive: true }
  );

  if (sightPrev) {
    sightPrev.addEventListener("click", () => moveSightSlider(-1));
  }
  if (sightNext) {
    sightNext.addEventListener("click", () => moveSightSlider(1));
  }

  // Downstream Calculator Logic
  function recalculateEarnings() {
    const typeEl = document.getElementById("calc-type");
    const hoursEl = document.getElementById("calc-hours");
    const labelEl = document.getElementById("calc-hours-label");
    const resultEl = document.getElementById("calc-revenue-result");
    if (!typeEl || !hoursEl || !labelEl || !resultEl) return;

    const rate = parseFloat(typeEl.value) || 85;
    const hours = parseInt(hoursEl.value, 10) || 18;
    labelEl.textContent = `${hours} Hours / Week`;

    const weekly = rate * hours;
    const monthly = Math.round(weekly * 4);
    resultEl.textContent = `$${monthly.toLocaleString()}`;
  }

  // Auth & Session Check
  function checkAuth() {
    if (typeof Auth !== "undefined" && Auth.isAuthenticated()) {
      const user = Auth.getUser();
      const uname = (user && user.username) ? user.username : "Host";
      const signinLink = document.getElementById("nav-signin-link");
      if (signinLink) {
        signinLink.innerHTML = `👋 ${uname}`;
        signinLink.href = "javascript:void(0)";
        signinLink.onclick = () => Auth.redirectBasedOnRole();
      }
    }
  }

  // Initialization
  function initAll() {
    setupSightSlider();
    requestTick();

    const calcType = document.getElementById("calc-type");
    const calcHours = document.getElementById("calc-hours");
    if (calcType) calcType.addEventListener("change", recalculateEarnings);
    if (calcHours) calcHours.addEventListener("input", recalculateEarnings);
    recalculateEarnings();

    checkAuth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
