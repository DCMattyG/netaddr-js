import {
  IPGlob,
  IPRange,
  IPSet,
  cidr_to_glob,
  glob_to_cidrs,
  glob_to_iprange,
  glob_to_iptuple,
  iprange_to_globs,
  iter_nmap_range,
  valid_glob,
  valid_nmap_range,
} from '../../../src/index.js';
import { bindModeToggle, readList, runAndRender } from '../utils.js';

function readSet(text) {
  return new IPSet(readList(text));
}

export function bindRangeSetLab(els) {
  function trace(action, command, inputs) {
    return () => ({
      action,
      command,
      inputs: typeof inputs === 'function' ? inputs() : inputs,
    });
  }

  function bindRangeMode() {
    bindModeToggle({
      buttonSelector: '[data-range-mode-target]',
      groupSelector: '[data-range-mode-group]',
      buttonKey: 'rangeModeTarget',
      groupKey: 'rangeModeGroup',
      defaultMode: 'range',
    });
  }

  function bindIpSetMode() {
    bindModeToggle({
      buttonSelector: '[data-ipset-mode-target]',
      groupSelector: '[data-ipset-mode-group]',
      buttonKey: 'ipsetModeTarget',
      groupKey: 'ipsetModeGroup',
      defaultMode: 'setops',
    });
  }

  function runRangeToCidrs() {
    runAndRender(els.rangeOutput, () => {
      const range = new IPRange(els.rangeStart.value, els.rangeEnd.value);
      const cidrs = range.cidrs().map((item) => item.toString());
      return {
        range: range.toString(),
        cidrCount: cidrs.length,
        cidrs,
        globs: iprange_to_globs(els.rangeStart.value, els.rangeEnd.value),
      };
    }, trace('Range to CIDRs', [
      'const range = new IPRange(start, end);',
      'const cidrs = range.cidrs();',
      'const globs = iprange_to_globs(start, end);',
    ], () => ({
      start: els.rangeStart.value,
      end: els.rangeEnd.value,
    })));
  }

  function runGlobLab() {
    runAndRender(els.rangeOutput, () => {
      const glob = els.globInput.value;
      const tuple = glob_to_iptuple(glob);
      const range = glob_to_iprange(glob);
      const cidrs = glob_to_cidrs(glob);

      return {
        glob,
        valid: valid_glob(glob),
        tuple,
        range: range.toString(),
        cidrs: cidrs.map((item) => item.toString()),
        roundTripGlobFromFirstCidr: cidr_to_glob(cidrs[0]),
        globsFromTupleRange: iprange_to_globs(tuple[0], tuple[1]),
        classToString: new IPGlob(glob).toString(),
      };
    }, trace('Analyze Glob', [
      'const tuple = glob_to_iptuple(glob);',
      'const range = glob_to_iprange(glob);',
      'const cidrs = glob_to_cidrs(glob);',
      'const firstGlob = cidr_to_glob(cidrs[0]);',
    ], () => ({
      glob: els.globInput.value,
    })));
  }

  function runNmapLab() {
    runAndRender(els.rangeOutput, () => {
      const spec = els.nmapInput.value;
      const ips = Array.from(iter_nmap_range(spec));
      return {
        spec,
        valid: valid_nmap_range(spec),
        count: ips.length,
        preview: ips.slice(0, 24).map((ip) => ip.toString()),
      };
    }, trace('Analyze Nmap', [
      'const isValid = valid_nmap_range(spec);',
      'const ips = Array.from(iter_nmap_range(spec));',
    ], () => ({
      spec: els.nmapInput.value,
    })));
  }

  function runSetOperation(kind) {
    const commandMap = {
      union: ['const setA = new IPSet(a);', 'const setB = new IPSet(b);', 'setA.union(setB);'],
      intersection: ['const setA = new IPSet(a);', 'const setB = new IPSet(b);', 'setA.intersection(setB);'],
      difference: ['const setA = new IPSet(a);', 'const setB = new IPSet(b);', 'setA.difference(setB);'],
      symmetricDifference: [
        'const setA = new IPSet(a);',
        'const setB = new IPSet(b);',
        'setA.symmetric_difference(setB);',
      ],
    };

    runAndRender(els.ipsetOutput, () => {
      const a = readSet(els.ipsetA.value);
      const b = readSet(els.ipsetB.value);

      const operations = {
        union: () => a.union(b),
        intersection: () => a.intersection(b),
        difference: () => a.difference(b),
        symmetricDifference: () => a.symmetric_difference(b),
      };

      const result = operations[kind]();
      return {
        operation: kind,
        result: result.iter_cidrs().map((item) => item.toString()),
      };
    }, trace(`IPSet ${kind}`, commandMap[kind], () => ({
      setA: readList(els.ipsetA.value),
      setB: readList(els.ipsetB.value),
    })));
  }

  function runIpSetAnalyze() {
    runAndRender(els.ipsetOutput, () => {
      const a = readSet(els.ipsetA.value);
      const b = readSet(els.ipsetB.value);
      const check = els.ipsetCheck.value;

      return {
        setA: {
          cidrs: a.iter_cidrs().map((item) => item.toString()),
          ranges: a.iter_ipranges().map((item) => item.toString()),
          size: a.size.toString(),
          contiguous: a.iscontiguous(),
        },
        setB: {
          cidrs: b.iter_cidrs().map((item) => item.toString()),
          ranges: b.iter_ipranges().map((item) => item.toString()),
          size: b.size.toString(),
          contiguous: b.iscontiguous(),
        },
        containsCheck: {
          candidate: check,
          inA: a.contains(check),
          inB: b.contains(check),
        },
      };
    }, trace('IPSet Analyze and Contains', [
      'const setA = new IPSet(setAItems);',
      'const setB = new IPSet(setBItems);',
      'setA.contains(candidate);',
      'setB.contains(candidate);',
      'setA.iter_cidrs();',
      'setA.iter_ipranges();',
    ], () => ({
      setA: readList(els.ipsetA.value),
      setB: readList(els.ipsetB.value),
      candidate: els.ipsetCheck.value,
    })));
  }

  els.rangeRun.addEventListener('click', runRangeToCidrs);
  els.globRun.addEventListener('click', runGlobLab);
  els.nmapRun.addEventListener('click', runNmapLab);

  els.ipsetUnionRun.addEventListener('click', () => runSetOperation('union'));
  els.ipsetIntersectionRun.addEventListener('click', () => runSetOperation('intersection'));
  els.ipsetDiffRun.addEventListener('click', () => runSetOperation('difference'));
  els.ipsetSymDiffRun.addEventListener('click', () => runSetOperation('symmetricDifference'));
  els.ipsetAnalyzeRun.addEventListener('click', runIpSetAnalyze);

  bindRangeMode();
  bindIpSetMode();

  return {
    runRangeToCidrs,
    runGlobLab,
    runNmapLab,
    runIpSetAnalyze,
  };
}
