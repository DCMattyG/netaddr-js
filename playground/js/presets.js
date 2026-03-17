const PRESETS = {
  quick_ipv4: {
    ipInput: '10.10.2.14',
    ipVersion: 'auto',
    ipFlagAton: false,
    ipFlagPton: false,
    ipFlagZerofill: false,
    networkInput: '10.10.2.33/24',
    networkContains: '10.10.2.40',
    networkOverlap: '10.10.2.0/25',
    networkSubnetPrefix: '26',
    networkSupernetPrefix: '16',
    networkFlagNohost: true,
    include: '10.10.2.0/24\n10.10.3.0/24\n10.10.4.0/24',
    exclude: '10.10.3.128/25',
    cidrTarget: '10.10.3.0/24',
    cidrExcludeOne: '10.10.3.128/25',
    cidrMatchIp: '10.10.3.200',
    cidrAbbrev: '10/8',
    rangeStart: '10.10.9.0',
    rangeEnd: '10.10.9.31',
    globInput: '10.10.9.*',
    nmapInput: '10.10.9.1-3',
    ipsetA: '10.10.2.0/24\n10.10.4.0/24',
    ipsetB: '10.10.2.128/25\n10.10.5.0/24',
    ipsetCheck: '10.10.2.140',
    euiInput: '00-1b-77-49-54-fd',
    euiPrefix: '2001:db8::/64',
    registryOui: '001b77',
    registryIab: '001b77449',
    rfcIpv6: '2001:db8::dead:beef',
    validatorIpv4: '10.10.2.1',
    validatorIpv6: '2001:db8::10',
    validatorMac: '00:1b:77:49:54:fd',
    validatorEui64: '00:1b:77:ff:fe:49:54:fd',
    splitterBase: '10.10.20.0/24',
    splitterPrefix: '26',
    splitterCount: '2',
  },
  quick_ipv6: {
    ipInput: '2001:db8::abcd',
    ipVersion: '6',
    ipFlagAton: false,
    ipFlagPton: true,
    ipFlagZerofill: false,
    networkInput: '2001:db8::1234/64',
    networkContains: '2001:db8::beef',
    networkOverlap: '2001:db8::/65',
    networkSubnetPrefix: '68',
    networkSupernetPrefix: '48',
    networkFlagNohost: true,
    include: '2001:db8::/126\n2001:db8::8/125',
    exclude: '2001:db8::2/127',
    cidrTarget: '2001:db8::/125',
    cidrExcludeOne: '2001:db8::2/127',
    cidrMatchIp: '2001:db8::3',
    cidrAbbrev: '192.0.2',
    rangeStart: '2001:db8::20',
    rangeEnd: '2001:db8::2f',
    globInput: '192.0.2.*',
    nmapInput: '192.0.2.1,3,5-6',
    ipsetA: '2001:db8::/126\n2001:db8::20/124',
    ipsetB: '2001:db8::2/127\n2001:db8::22/127',
    ipsetCheck: '2001:db8::23',
    euiInput: '00-1b-77-49-54-fd',
    euiPrefix: 'fd00:1234::/64',
    registryOui: '001b77',
    registryIab: '001b77449',
    rfcIpv6: '2001:db8::1',
    validatorIpv4: '192.0.2.5',
    validatorIpv6: '2001:db8::beef',
    validatorMac: '00-1b-77-49-54-fd',
    validatorEui64: '00:1b:77:ff:fe:49:54:fd',
    splitterBase: '2001:db8:100::/120',
    splitterPrefix: '124',
    splitterCount: '3',
  },
  quick_mixed_set: {
    ipInput: '203.0.113.88',
    ipVersion: 'auto',
    ipFlagAton: false,
    ipFlagPton: false,
    ipFlagZerofill: false,
    networkInput: '203.0.113.88/26',
    networkContains: '203.0.113.120',
    networkOverlap: '203.0.113.96/27',
    networkSubnetPrefix: '28',
    networkSupernetPrefix: '24',
    networkFlagNohost: false,
    include: '203.0.113.0/25\n203.0.113.128/25\n2001:db8:abcd::/126',
    exclude: '203.0.113.64/26\n2001:db8:abcd::2/127',
    cidrTarget: '203.0.113.0/24',
    cidrExcludeOne: '203.0.113.64/26',
    cidrMatchIp: '203.0.113.70',
    cidrAbbrev: '172.16',
    rangeStart: '203.0.113.192',
    rangeEnd: '203.0.113.207',
    globInput: '203.0.113.192-207',
    nmapInput: '203.0.113.192-193.1,3',
    ipsetA: '203.0.113.0/24\n2001:db8:abcd::/126',
    ipsetB: '203.0.113.64/26\n2001:db8:abcd::2/127',
    ipsetCheck: '203.0.113.66',
    euiInput: '00-1b-77-44-95-fd',
    euiPrefix: 'fe80::/64',
    registryOui: '001b77',
    registryIab: '001b77449',
    rfcIpv6: '2001:db8:abcd::33',
    validatorIpv4: '203.0.113.9',
    validatorIpv6: '2001:db8:abcd::1',
    validatorMac: '001b.7749.54fd',
    validatorEui64: '021b.77ff.fe49.54fd',
    splitterBase: '203.0.113.0/24',
    splitterPrefix: '27',
    splitterCount: '4',
  },
  quick_mac: {
    euiInput: '00-1b-77-44-95-fd',
    euiPrefix: 'fd00:acme::/64',
    registryOui: '001b77',
    registryIab: '001b77449',
    validatorMac: '00-1b-77-44-95-fd',
    validatorEui64: '00:1b:77:ff:fe:44:95:fd',
  },
};

export function bindPresets(els) {
  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) {
      return;
    }

    for (const [field, value] of Object.entries(preset)) {
      if (!els[field]) {
        continue;
      }

      if (typeof value === 'boolean') {
        els[field].checked = value;
      } else {
        els[field].value = value;
      }
    }

  }

  function bind() {
    const presetButtons = Array.from(document.querySelectorAll('button[data-preset]'));
    for (const button of presetButtons) {
      button.addEventListener('click', () => {
        applyPreset(button.dataset.preset);
      });
    }
  }

  bind();
  return { applyPreset };
}
