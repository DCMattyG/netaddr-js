let traceLogger = null;
const MAX_TRACE_OUTPUT_CHARS = 12000;

function activeLabId() {
  return document.body.dataset.activeLab ?? 'address-network';
}

function activeModeLabel(outputElement) {
  const panel = outputElement?.closest('.panel');
  const button = panel?.querySelector('.lab-mode button.active');
  return button?.textContent?.trim() ?? null;
}

function stringifyTraceOutput(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function trimTraceOutput(text) {
  if (typeof text !== 'string' || text.length <= MAX_TRACE_OUTPUT_CHARS) {
    return {
      output: text,
      outputTruncated: false,
    };
  }

  const trimmed = text.slice(0, MAX_TRACE_OUTPUT_CHARS);
  const omitted = text.length - MAX_TRACE_OUTPUT_CHARS;
  return {
    output: `${trimmed}\n... [truncated ${omitted} characters]`,
    outputTruncated: true,
  };
}

function normalizeTraceMeta(outputElement, traceMeta, status, errorText = null, outputValue = undefined) {
  if (!traceMeta) {
    return null;
  }

  const raw = typeof traceMeta === 'function' ? traceMeta() : traceMeta;
  if (!raw || !raw.command || !raw.action) {
    return null;
  }

  const outputText = stringifyTraceOutput(outputValue);
  const { output, outputTruncated } = trimTraceOutput(outputText);

  return {
    timestamp: Date.now(),
    status,
    error: errorText,
    labId: raw.labId ?? activeLabId(),
    mode: raw.mode ?? activeModeLabel(outputElement),
    action: raw.action,
    command: raw.command,
    inputs: raw.inputs ?? null,
    output,
    outputTruncated,
  };
}

function emitTrace(entry) {
  if (traceLogger && entry) {
    traceLogger(entry);
  }
}

export function setTraceLogger(logger) {
  traceLogger = typeof logger === 'function' ? logger : null;
}

export function logTrace(traceMeta) {
  emitTrace(normalizeTraceMeta(null, traceMeta, 'ok'));
}

export function setOutput(element, value, isError = false) {
  element.textContent = value;
  element.classList.toggle('error', isError);
}

export function runAndRender(outputElement, fn, traceMeta = null) {
  try {
    const value = fn();
    setOutput(outputElement, JSON.stringify(value, null, 2));
    emitTrace(normalizeTraceMeta(outputElement, traceMeta, 'ok', null, value));
  } catch (error) {
    setOutput(outputElement, String(error.message ?? error), true);
    emitTrace(normalizeTraceMeta(outputElement, traceMeta, 'error', String(error.message ?? error)));
  }
}

export function safe(fn) {
  try {
    return fn();
  } catch (error) {
    return `error: ${error.message ?? error}`;
  }
}

export function toVersionOrNull(value) {
  if (value === 'auto') {
    return null;
  }
  return Number(value);
}

export function readList(text) {
  return text
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function readInt(input, fallback = null) {
  const value = String(input ?? '').trim();
  if (value.length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`invalid integer value: ${input}`);
  }
  return parsed;
}

export function takeIterator(iterator, limit) {
  const values = [];
  for (const item of iterator) {
    values.push(String(item));
    if (values.length >= limit) {
      break;
    }
  }
  return values;
}

export function bindModeToggle({
  buttonSelector,
  groupSelector,
  buttonKey,
  groupKey,
  defaultMode,
}) {
  const buttons = Array.from(document.querySelectorAll(buttonSelector));
  const groups = Array.from(document.querySelectorAll(groupSelector));
  let currentMode = null;

  if (!buttons.length || !groups.length) {
    return;
  }

  function clearScopedOutputs() {
    const scope = buttons[0]?.closest('.panel') ?? groups[0]?.parentElement ?? document;
    const outputs = Array.from(scope.querySelectorAll('.output'));
    for (const output of outputs) {
      output.textContent = '';
      output.classList.remove('error');
    }
  }

  function setMode(mode) {
    const changed = mode !== currentMode;

    for (const button of buttons) {
      const active = button.dataset[buttonKey] === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    for (const group of groups) {
      group.hidden = group.dataset[groupKey] !== mode;
    }

    if (changed && currentMode !== null) {
      clearScopedOutputs();
    }

    currentMode = mode;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      setMode(button.dataset[buttonKey]);
    });
  }

  const fallbackMode = buttons[0]?.dataset[buttonKey] ?? null;
  setMode(defaultMode ?? fallbackMode);
}
