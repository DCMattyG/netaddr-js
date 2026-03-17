import {
  all_matching_cidrs,
  cidr_abbrev_to_verbose,
  cidr_exclude,
  cidr_merge,
  expand_partial_ipv4_address,
  iter_unique_ips,
  largest_matching_cidr,
  smallest_matching_cidr,
  spanning_cidr,
} from '../../../src/index.js';
import { bindModeToggle, readList, runAndRender, safe } from '../utils.js';

export function bindCidrLab(els) {
  function trace(action, command, inputs) {
    return () => ({
      action,
      command,
      inputs: typeof inputs === 'function' ? inputs() : inputs,
    });
  }

  function bindCidrMode() {
    bindModeToggle({
      buttonSelector: '[data-cidr-mode-target]',
      groupSelector: '[data-cidr-mode-group]',
      buttonKey: 'cidrModeTarget',
      groupKey: 'cidrModeGroup',
      defaultMode: 'merge',
    });
  }

  function runCidrMerge() {
    runAndRender(els.cidrOutput, () => {
      const include = readList(els.include.value);
      const merged = cidr_merge(include).map((item) => item.toString());
      return {
        includeCount: include.length,
        mergedCount: merged.length,
        merged,
      };
    }, trace('CIDR Merge', [
      'const merged = cidr_merge(includeCidrs);',
      'merged.map((item) => item.toString());',
    ], () => ({
      include: readList(els.include.value),
    })));
  }

  function runCidrExclude() {
    runAndRender(els.cidrOutput, () => {
      return {
        target: els.cidrTarget.value,
        exclude: els.cidrExcludeOne.value,
        result: cidr_exclude(els.cidrTarget.value, els.cidrExcludeOne.value).map((item) => item.toString()),
      };
    }, trace('CIDR Exclude', [
      'const remaining = cidr_exclude(targetCidr, excludeCidr);',
      'remaining.map((item) => item.toString());',
    ], () => ({
      target: els.cidrTarget.value,
      exclude: els.cidrExcludeOne.value,
    })));
  }

  function runCidrSpan() {
    runAndRender(els.cidrOutput, () => {
      const include = readList(els.include.value);
      return {
        include,
        spanningCidr: spanning_cidr(include).toString(),
      };
    }, trace('Spanning CIDR', [
      'const span = spanning_cidr(includeCidrs);',
      'span.toString();',
    ], () => ({
      include: readList(els.include.value),
    })));
  }

  function runCidrMatch() {
    runAndRender(els.cidrOutput, () => {
      const include = readList(els.include.value);
      const ip = els.cidrMatchIp.value;

      return {
        ip,
        include,
        largest: safe(() => largest_matching_cidr(ip, include)?.toString() ?? null),
        smallest: safe(() => smallest_matching_cidr(ip, include)?.toString() ?? null),
        all: safe(() => all_matching_cidrs(ip, include).map((item) => item.toString())),
      };
    }, trace('CIDR Match', [
      'const largest = largest_matching_cidr(ip, includeCidrs);',
      'const smallest = smallest_matching_cidr(ip, includeCidrs);',
      'const all = all_matching_cidrs(ip, includeCidrs);',
    ], () => ({
      ip: els.cidrMatchIp.value,
      include: readList(els.include.value),
    })));
  }

  function runCidrUnique() {
    runAndRender(els.cidrOutput, () => {
      const include = readList(els.include.value);
      const additionalCidrs = readList(els.exclude.value);

      return {
        include,
        additionalCidrs,
        uniqueNormalized: Array.from(iter_unique_ips(include, additionalCidrs)).map((item) => item.toString()),
      };
    }, trace('Iter Unique IPs', [
      'const unique = iter_unique_ips(includeCidrs, additionalCidrs);',
      'Array.from(unique);',
    ], () => ({
      include: readList(els.include.value),
      additionalCidrs: readList(els.exclude.value),
    })));
  }

  function runCidrAbbrev() {
    runAndRender(els.cidrOutput, () => {
      const input = els.cidrAbbrev.value;
      const partial = input.includes('/') ? input.split('/')[0] : input;

      return {
        input,
        cidrAbbrevToVerbose: cidr_abbrev_to_verbose(input),
        expandPartialIpv4: safe(() => expand_partial_ipv4_address(partial)),
      };
    }, trace('CIDR Normalize and Expand', [
      'const verbose = cidr_abbrev_to_verbose(input);',
      'const expanded = expand_partial_ipv4_address(partial);',
    ], () => ({
      input: els.cidrAbbrev.value,
    })));
  }

  els.cidrMergeRun.addEventListener('click', runCidrMerge);
  els.cidrExcludeRun.addEventListener('click', runCidrExclude);
  els.cidrSpanRun.addEventListener('click', runCidrSpan);
  els.cidrMatchRun.addEventListener('click', runCidrMatch);
  els.cidrUniqueRun.addEventListener('click', runCidrUnique);
  els.cidrAbbrevRun.addEventListener('click', runCidrAbbrev);

  bindCidrMode();

  return {
    runCidrMerge,
    runCidrExclude,
    runCidrSpan,
    runCidrMatch,
    runCidrUnique,
    runCidrAbbrev,
  };
}
