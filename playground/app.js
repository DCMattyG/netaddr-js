import { getElements } from './js/elements.js';
import { bindLabNavigation } from './js/navigation.js';
import { bindPresets } from './js/presets.js';
import { bindAddressNetworkLab } from './js/labs/addressNetworkLab.js';
import { bindCidrLab } from './js/labs/cidrLab.js';
import { bindRangeSetLab } from './js/labs/rangeSetLab.js';
import { bindEuiMiscLab } from './js/labs/euiMiscLab.js';
import { initCommandTrace } from './js/trace.js';
import { setTraceLogger } from './js/utils.js';

function init() {
  const els = getElements();
  const trace = initCommandTrace();

  bindLabNavigation();
  const presets = bindPresets(els);

  const addressNetwork = bindAddressNetworkLab(els);
  const cidr = bindCidrLab(els);
  const rangeSet = bindRangeSetLab(els);
  const euiMisc = bindEuiMiscLab(els);

  presets.applyPreset('quick_ipv4');

  addressNetwork.runIpLab();
  addressNetwork.runNetworkLab();
  cidr.runCidrMerge();
  rangeSet.runRangeToCidrs();
  rangeSet.runGlobLab();
  rangeSet.runNmapLab();
  rangeSet.runIpSetAnalyze();
  euiMisc.runEuiLab();
  euiMisc.runRegistryLookup();
  euiMisc.runRfcLab();
  euiMisc.runValidatorsLab();
  euiMisc.runSplitterLab();

  // Start command tracing only after initial bootstrap renders so refresh starts with an empty dock.
  setTraceLogger(trace.addEntry);
}

init();
