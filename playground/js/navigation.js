const DEFAULT_LAB = 'address-network';

function getInitialLabId() {
  const hash = window.location.hash.replace('#', '').trim();
  if (!hash.startsWith('lab=')) {
    return DEFAULT_LAB;
  }

  return hash.slice('lab='.length) || DEFAULT_LAB;
}

function setHashLab(labId) {
  const nextHash = `lab=${labId}`;
  if (window.location.hash.replace('#', '') !== nextHash) {
    window.location.hash = nextHash;
  }
}

export function bindLabNavigation() {
  const buttons = Array.from(document.querySelectorAll('.lab-nav-grid button[data-target]'));
  const sections = Array.from(document.querySelectorAll('[data-lab-section]'));
  const sectionIds = new Set(sections.map((section) => section.dataset.labSection));
  let activeLab = null;

  function clearSectionOutputs(section) {
    const outputs = Array.from(section.querySelectorAll('.output'));
    for (const output of outputs) {
      output.textContent = '';
      output.classList.remove('error');
    }
  }

  function applyActiveLab(labId) {
    const resolved = sectionIds.has(labId) ? labId : DEFAULT_LAB;
    const changed = resolved !== activeLab;
    document.body.dataset.activeLab = resolved;

    for (const button of buttons) {
      const active = button.dataset.target === resolved;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    for (const section of sections) {
      section.hidden = section.dataset.labSection !== resolved;
      if (changed && !section.hidden) {
        clearSectionOutputs(section);
      }
    }

    activeLab = resolved;

    return resolved;
  }

  const initial = applyActiveLab(getInitialLabId());
  setHashLab(initial);

  for (const button of buttons) {
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => {
      const active = applyActiveLab(button.dataset.target);
      setHashLab(active);
    });
  }

  window.addEventListener('hashchange', () => {
    applyActiveLab(getInitialLabId());
  });
}
