const MAX_TRACE_ENTRIES = 40;

const LAB_LABELS = {
  'address-network': 'Address and Network',
  'cidr-match': 'CIDR and Match',
  'range-ipset': 'Range, Glob, Nmap, and IPSet',
  'eui-misc': 'EUI, RFC1924, Validators, and Splitter',
};

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function normalizeCommand(command) {
  if (Array.isArray(command)) {
    return command.join('\n');
  }
  return String(command);
}

function normalizeInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') {
    return null;
  }

  const keys = Object.keys(inputs);
  if (!keys.length) {
    return null;
  }

  return JSON.stringify(inputs, null, 2);
}

export function initCommandTrace() {
  const dock = document.querySelector('[data-command-trace-dock]');
  const toggle = document.querySelector('[data-command-trace-toggle]');
  const count = document.querySelector('[data-command-trace-count]');
  const lastChip = document.querySelector('[data-command-trace-last]');
  const clearButton = document.querySelector('[data-command-trace-clear]');
  const panel = document.querySelector('[data-command-trace-panel]');
  const list = document.querySelector('[data-command-trace-list]');

  if (!dock || !toggle || !count || !lastChip || !clearButton || !panel || !list) {
    return {
      addEntry() {},
    };
  }

  let open = false;
  let entries = [];

  function renderCount() {
    count.textContent = String(entries.length);
  }

  function renderLastChip() {
    const latest = entries[0];
    if (!latest) {
      lastChip.textContent = 'Last: none';
      return;
    }

    lastChip.textContent = `Last: ${latest.action}`;
  }

  function renderList() {
    list.textContent = '';

    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'trace-entry trace-entry-empty';
      empty.textContent = 'No commands yet. Click a playground action button to start tracing.';
      list.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      const item = document.createElement('li');
      item.className = 'trace-entry';
      if (entry.status === 'error') {
        item.classList.add('trace-entry-error');
      }

      const heading = document.createElement('p');
      heading.className = 'trace-entry-heading';
      const labLabel = LAB_LABELS[entry.labId] ?? entry.labId;
      const modeText = entry.mode ? ` > ${entry.mode}` : '';
      heading.textContent = `[${formatTime(entry.timestamp)}] ${labLabel}${modeText} > ${entry.action}`;
      item.appendChild(heading);

      item.appendChild(createCopyBlock({
        text: normalizeCommand(entry.command),
        className: 'trace-entry-command',
        label: 'command',
      }));

      const inputs = normalizeInputs(entry.inputs);
      if (inputs) {
        item.appendChild(createCopyBlock({
          text: `inputs: ${inputs}`,
          className: 'trace-entry-inputs',
          label: 'inputs',
        }));
      }

      if (entry.output) {
        item.appendChild(createOutputDetails(entry.output, entry.outputTruncated));
      }

      if (entry.status === 'error' && entry.error) {
        item.appendChild(createCopyBlock({
          text: `error: ${entry.error}`,
          className: 'trace-entry-error-text',
          label: 'error',
        }));
      }

      list.appendChild(item);
    }
  }

  function createCopyBlock({ text, className, label }) {
    const block = document.createElement('div');
    block.className = 'trace-copy-block';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'trace-copy-icon';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', `Copy ${label}`);
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(text).catch(() => {
        // Ignore clipboard failures in unsupported or restricted contexts.
      });
    });

    const body = document.createElement('pre');
    body.className = className;
    body.textContent = text;

    block.appendChild(copy);
    block.appendChild(body);
    return block;
  }

  function createOutputDetails(outputText, truncated) {
    const details = document.createElement('details');
    details.className = 'trace-output-details';

    const summary = document.createElement('summary');
    summary.className = 'trace-output-summary';
    summary.textContent = truncated ? 'Output (truncated)' : 'Output';

    details.appendChild(summary);
    details.appendChild(createCopyBlock({
      text: outputText,
      className: 'trace-entry-output',
      label: 'output',
    }));

    return details;
  }

  function renderAll() {
    renderCount();
    renderLastChip();
    renderList();
  }

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    dock.dataset.open = open ? 'true' : 'false';
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('trace-open', open);
  }

  function clearAll() {
    entries = [];
    renderAll();
  }

  function addEntry(entry) {
    entries.unshift(entry);
    if (entries.length > MAX_TRACE_ENTRIES) {
      entries = entries.slice(0, MAX_TRACE_ENTRIES);
    }

    renderAll();
  }

  toggle.addEventListener('click', () => setOpen(!open));
  clearButton.addEventListener('click', clearAll);

  renderAll();
  setOpen(false);

  return {
    addEntry,
  };
}
