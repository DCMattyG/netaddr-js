import {
  INET_ATON,
  INET_PTON,
  NOHOST,
  IPAddress,
  IPNetwork,
  ZEROFILL,
  ipv6_compact,
  ipv6_full,
  ipv6_verbose,
} from '../../../src/index.js';
import { bindModeToggle, readInt, runAndRender, safe, takeIterator, toVersionOrNull } from '../utils.js';

function buildIpFlags(els) {
  let flags = 0;
  if (els.ipFlagAton.checked) {
    flags |= INET_ATON;
  }
  if (els.ipFlagPton.checked) {
    flags |= INET_PTON;
  }
  if (els.ipFlagZerofill.checked) {
    flags |= ZEROFILL;
  }
  if (els.ipFlagAton.checked && els.ipFlagPton.checked) {
    throw new Error('INET_ATON and INET_PTON cannot be enabled together.');
  }
  return flags;
}

export function bindAddressNetworkLab(els) {
  function trace(action, command, inputs) {
    return () => ({
      action,
      command,
      inputs: typeof inputs === 'function' ? inputs() : inputs,
    });
  }

  function bindIpMode() {
    bindModeToggle({
      buttonSelector: '[data-ip-mode-target]',
      groupSelector: '[data-ip-mode-group]',
      buttonKey: 'ipModeTarget',
      groupKey: 'ipModeGroup',
      defaultMode: 'profile',
    });
  }

  function bindNetworkMode() {
    bindModeToggle({
      buttonSelector: '[data-network-mode-target]',
      groupSelector: '[data-network-mode-group]',
      buttonKey: 'networkModeTarget',
      groupKey: 'networkModeGroup',
      defaultMode: 'overview',
    });
  }

  function getIpMode() {
    const active = document.querySelector('[data-ip-mode-target].active');
    return active?.dataset.ipModeTarget ?? 'profile';
  }

  function getNetwork() {
    const flags = els.networkFlagNohost.checked ? NOHOST : 0;
    return new IPNetwork(els.networkInput.value, null, flags);
  }

  function getPlanningContext() {
    const net = getNetwork();
    const subnetPrefix = readInt(els.networkSubnetPrefix.value, net.prefixlen + 1);
    const supernetPrefix = readInt(els.networkSupernetPrefix.value, net.prefixlen);

    return { net, subnetPrefix, supernetPrefix };
  }

  function runIpLab() {
    runAndRender(els.ipOutput, () => {
      const version = toVersionOrNull(els.ipVersion.value);
      const flags = getIpMode() === 'parser' ? buildIpFlags(els) : 0;
      const ip = new IPAddress(els.ipInput.value, version, flags);

      return {
        input: els.ipInput.value,
        canonical: ip.toString(),
        version: ip.version,
        asBigInt: ip.toBigInt().toString(),
        bin: ip.bin,
        bits: ip.bits(),
        packedBytes: Array.from(ip.packed),
        reverseDns: ip.reverse_dns,
        isPrivate: ip.is_private(),
        isLoopback: ip.is_loopback(),
        isMulticast: ip.is_multicast(),
        isGlobal: ip.is_global(),
        info: ip.info,
        ipv6Compact: ip.format(ipv6_compact),
        ipv6Full: ip.format(ipv6_full),
        ipv6Verbose: ip.format(ipv6_verbose),
        mappedIpv6: ip.version === 4 ? ip.ipv6().toString() : null,
        low32AsIpv4: ip.version === 6 ? safe(() => ip.ipv4().toString()) : null,
        plusOne: safe(() => ip.add(1).toString()),
        minusOne: safe(() => ip.sub(1).toString()),
      };
    }, trace('Analyze IP', [
      'const ip = new IPAddress(input, version, flags);',
      'ip.toString();',
      'ip.toBigInt();',
    ], () => ({
      input: els.ipInput.value,
      version: els.ipVersion.value,
      mode: getIpMode(),
      flags: {
        INET_ATON: getIpMode() === 'parser' ? els.ipFlagAton.checked : false,
        INET_PTON: getIpMode() === 'parser' ? els.ipFlagPton.checked : false,
        ZEROFILL: getIpMode() === 'parser' ? els.ipFlagZerofill.checked : false,
      },
    })));
  }

  function runNetworkLab() {
    runAndRender(els.networkOutput, () => {
      const net = getNetwork();
      const cidr = net.cidr;
      const hostsPreview = takeIterator(net.iter_hosts(), 8);

      return {
        input: els.networkInput.value,
        storedString: net.toString(),
        normalizedCidr: cidr.toString(),
        network: String(net.network),
        first: String(new IPAddress(net.first, net.version)),
        last: String(new IPAddress(net.last, net.version)),
        netmask: String(net.netmask),
        hostmask: String(net.hostmask),
        broadcast: net.broadcast ? String(net.broadcast) : null,
        size: net.size.toString(),
        previous: safe(() => net.previous().toString()),
        next: safe(() => net.next().toString()),
        ipv4Form: safe(() => net.ipv4().toString()),
        ipv6Form: safe(() => net.ipv6().toString()),
        sampleHosts: hostsPreview,
        sampleHostCount: hostsPreview.length,
      };
    }, trace('Overview Network Analysis', [
      'const net = new IPNetwork(input, null, flags);',
      'net.network;',
      'net.iter_hosts();',
      'net.previous();',
      'net.next();',
    ], () => ({
      input: els.networkInput.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  function runNetworkSummary() {
    runAndRender(els.networkOutput, () => {
      const net = getNetwork();
      const cidr = net.cidr;
      return {
        input: els.networkInput.value,
        storedString: net.toString(),
        normalizedCidr: cidr.toString(),
        network: String(net.network),
        first: String(new IPAddress(net.first, net.version)),
        last: String(new IPAddress(net.last, net.version)),
        netmask: String(net.netmask),
        hostmask: String(net.hostmask),
        broadcast: net.broadcast ? String(net.broadcast) : null,
        size: net.size.toString(),
      };
    }, trace('Network Summary', [
      'const net = new IPNetwork(input, null, flags);',
      'net.cidr;',
      'net.netmask;',
    ], () => ({
      input: els.networkInput.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  function runNetworkHosts() {
    runAndRender(els.networkOutput, () => {
      const net = getNetwork();
      const hostsPreview = takeIterator(net.iter_hosts(), 16);
      return {
        input: els.networkInput.value,
        hostsPreview,
        previewCount: hostsPreview.length,
      };
    }, trace('Network Hosts Preview', [
      'const net = new IPNetwork(input, null, flags);',
      'net.iter_hosts();',
    ], () => ({
      input: els.networkInput.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  function runNetworkContains() {
    runAndRender(els.networkOutput, () => {
      const net = getNetwork();
      return {
        network: net.toString(),
        candidate: els.networkContains.value,
        contains: safe(() => net.contains(els.networkContains.value)),
      };
    }, trace('Contains Check', [
      'const net = new IPNetwork(input, null, flags);',
      'net.contains(candidate);',
    ], () => ({
      input: els.networkInput.value,
      candidate: els.networkContains.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  function runNetworkOverlap() {
    runAndRender(els.networkOutput, () => {
      const net = getNetwork();
      return {
        network: net.toString(),
        candidate: els.networkOverlap.value,
        overlaps: safe(() => net.overlaps(els.networkOverlap.value)),
      };
    }, trace('Overlap Check', [
      'const net = new IPNetwork(input, null, flags);',
      'net.overlaps(candidate);',
    ], () => ({
      input: els.networkInput.value,
      candidate: els.networkOverlap.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  function runNetworkSubnet() {
    runAndRender(els.networkOutput, () => {
      const { net, subnetPrefix } = getPlanningContext();
      return {
        network: net.toString(),
        subnetPrefix,
        subnets: safe(() => net.subnet(subnetPrefix, 8).map((item) => item.toString())),
      };
    }, trace('Subnet Preview', [
      'const net = new IPNetwork(input, null, flags);',
      'net.subnet(subnetPrefix, 8);',
    ], () => ({
      input: els.networkInput.value,
      subnetPrefix: els.networkSubnetPrefix.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  function runNetworkSupernet() {
    runAndRender(els.networkOutput, () => {
      const { net, supernetPrefix } = getPlanningContext();
      return {
        network: net.toString(),
        supernetPrefix,
        supernet: safe(() => net.supernet(supernetPrefix).toString()),
      };
    }, trace('Supernet', [
      'const net = new IPNetwork(input, null, flags);',
      'net.supernet(supernetPrefix);',
    ], () => ({
      input: els.networkInput.value,
      supernetPrefix: els.networkSupernetPrefix.value,
      flags: { NOHOST: els.networkFlagNohost.checked },
    })));
  }

  els.ipRun.addEventListener('click', runIpLab);
  els.networkSummaryRun.addEventListener('click', runNetworkSummary);
  els.networkHostsRun.addEventListener('click', runNetworkHosts);
  els.networkContainsRun.addEventListener('click', runNetworkContains);
  els.networkOverlapRun.addEventListener('click', runNetworkOverlap);
  els.networkSubnetRun.addEventListener('click', runNetworkSubnet);
  els.networkSupernetRun.addEventListener('click', runNetworkSupernet);
  els.networkRun.addEventListener('click', runNetworkLab);

  bindIpMode();
  bindNetworkMode();

  return {
    runIpLab,
    runNetworkLab,
    runNetworkSummary,
    runNetworkHosts,
    runNetworkContains,
    runNetworkOverlap,
    runNetworkSubnet,
    runNetworkSupernet,
  };
}
