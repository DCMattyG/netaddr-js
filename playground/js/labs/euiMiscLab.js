import {
  EUI,
  IAB,
  OUI,
  SubnetSplitter,
  base85_to_ipv6,
  clear_ieee_registries,
  eui64_bare,
  eui64_base,
  eui64_cisco,
  eui64_unix,
  eui64_unix_expanded,
  ipv6_to_base85,
  lookup_iab,
  lookup_oui,
  mac_bare,
  mac_cisco,
  mac_eui48,
  mac_pgsql,
  mac_unix,
  mac_unix_expanded,
  register_iab,
  register_oui,
  valid_eui64,
  valid_ipv4,
  valid_ipv6,
  valid_mac,
} from '../../../src/index.js';
import { bindModeToggle, readInt, runAndRender, safe } from '../utils.js';

export function bindEuiMiscLab(els) {
  function trace(action, command, inputs) {
    return () => ({
      action,
      command,
      inputs: typeof inputs === 'function' ? inputs() : inputs,
    });
  }

  function bindEuiMode() {
    bindModeToggle({
      buttonSelector: '[data-eui-mode-target]',
      groupSelector: '[data-eui-mode-group]',
      buttonKey: 'euiModeTarget',
      groupKey: 'euiModeGroup',
      defaultMode: 'analysis',
    });
  }

  function bindMiscMode() {
    bindModeToggle({
      buttonSelector: '[data-misc-mode-target]',
      groupSelector: '[data-misc-mode-group]',
      buttonKey: 'miscModeTarget',
      groupKey: 'miscModeGroup',
      defaultMode: 'rfc',
    });
  }

  function runEuiLab() {
    runAndRender(els.euiOutput, () => {
      const input = els.euiInput.value;
      const eui = new EUI(input);
      const eui64 = eui.eui64();

      return {
        input,
        parsed: eui.toString(),
        version: eui.version,
        value: eui.toBigInt().toString(),
        words: eui.words,
        packedBytes: Array.from(eui.packed),
        oui: eui.oui.toString(),
        iab: safe(() => eui.iab?.toString() ?? null),
        isIab: eui.is_iab(),
        info: safe(() => eui.info),
        dialects: {
          mac_eui48: eui.format(mac_eui48),
          mac_unix: eui.format(mac_unix),
          mac_unix_expanded: eui.format(mac_unix_expanded),
          mac_cisco: eui.format(mac_cisco),
          mac_bare: eui.format(mac_bare),
          mac_pgsql: eui.format(mac_pgsql),
        },
        eui64: {
          base: eui64.format(eui64_base),
          unix: eui64.format(eui64_unix),
          unixExpanded: eui64.format(eui64_unix_expanded),
          cisco: eui64.format(eui64_cisco),
          bare: eui64.format(eui64_bare),
        },
        modifiedEui64: eui.modified_eui64().toString(),
        ipv6FromPrefix: safe(() => eui.ipv6(els.euiPrefix.value).toString()),
        ipv6LinkLocal: safe(() => eui.ipv6_link_local().toString()),
        validators: {
          validMac: valid_mac(input),
          validEui64: valid_eui64(input),
        },
      };
    }, trace('Analyze EUI', [
      'const eui = new EUI(input);',
      'const formatted = eui.format(mac_unix);',
      'const eui64 = eui.eui64();',
      'const derived = eui.ipv6(prefix);',
    ], () => ({
      input: els.euiInput.value,
      prefix: els.euiPrefix.value,
    })));
  }

  function runRegistryRegister() {
    runAndRender(els.euiOutput, () => {
      const oui = els.registryOui.value;
      const iab = els.registryIab.value;

      register_oui(oui, {
        org: 'Playground Networks OUI',
        country: 'US',
        source: 'playground',
      });
      register_iab(iab, {
        org: 'Playground Networks IAB',
        country: 'US',
        source: 'playground',
      });

      return {
        registered: { oui, iab },
        lookupOui: lookup_oui(oui),
        lookupIab: lookup_iab(iab),
      };
    }, trace('Register Runtime OUI/IAB', [
      'register_oui(oui, registration);',
      'register_iab(iab, registration);',
    ], () => ({
      oui: els.registryOui.value,
      iab: els.registryIab.value,
    })));
  }

  function runRegistryLookup() {
    runAndRender(els.euiOutput, () => {
      const oui = els.registryOui.value;
      const iab = els.registryIab.value;

      return {
        lookupOui: lookup_oui(oui),
        lookupIab: lookup_iab(iab),
        ouiObject: safe(() => new OUI(oui).toString()),
        iabObject: safe(() => new IAB(iab).toString()),
        ouiRegistration: safe(() => new OUI(oui).registration),
        iabRegistration: safe(() => new IAB(iab).registration),
      };
    }, trace('Lookup Runtime OUI/IAB', [
      'const ouiRecord = lookup_oui(oui);',
      'const iabRecord = lookup_iab(iab);',
    ], () => ({
      oui: els.registryOui.value,
      iab: els.registryIab.value,
    })));
  }

  function runRegistryClear() {
    runAndRender(els.euiOutput, () => {
      clear_ieee_registries();
      return {
        cleared: true,
        lookupOuiAfterClear: safe(() => lookup_oui(els.registryOui.value)),
        lookupIabAfterClear: safe(() => lookup_iab(els.registryIab.value)),
      };
    }, trace('Clear Runtime Registries', 'clear_ieee_registries();', () => ({
      oui: els.registryOui.value,
      iab: els.registryIab.value,
    })));
  }

  function runRfcLab() {
    runAndRender(els.miscOutput, () => {
      const input = els.rfcIpv6.value;
      const base85 = ipv6_to_base85(input);
      return {
        input,
        base85,
        roundTrip: base85_to_ipv6(base85).toString(),
      };
    }, trace('RFC1924 Roundtrip', [
      'const base85 = ipv6_to_base85(ipv6);',
      'const roundTrip = base85_to_ipv6(base85);',
    ], () => ({
      ipv6: els.rfcIpv6.value,
    })));
  }

  function runValidatorsLab() {
    runAndRender(els.miscOutput, () => {
      return {
        validators: {
          ipv4: {
            input: els.validatorIpv4.value,
            valid: valid_ipv4(els.validatorIpv4.value),
          },
          ipv6: {
            input: els.validatorIpv6.value,
            valid: valid_ipv6(els.validatorIpv6.value),
          },
          mac: {
            input: els.validatorMac.value,
            valid: valid_mac(els.validatorMac.value),
          },
          eui64: {
            input: els.validatorEui64.value,
            valid: valid_eui64(els.validatorEui64.value),
          },
        },
      };
    }, trace('Run Validators', [
      'const ipv4Ok = valid_ipv4(ipv4);',
      'const ipv6Ok = valid_ipv6(ipv6);',
      'const macOk = valid_mac(mac);',
      'const eui64Ok = valid_eui64(eui64);',
    ], () => ({
      ipv4: els.validatorIpv4.value,
      ipv6: els.validatorIpv6.value,
      mac: els.validatorMac.value,
      eui64: els.validatorEui64.value,
    })));
  }

  function runSplitterLab() {
    runAndRender(els.miscOutput, () => {
      const base = els.splitterBase.value;
      const prefix = readInt(els.splitterPrefix.value);
      const count = readInt(els.splitterCount.value, null);

      const splitter = new SubnetSplitter(base);
      const extracted = splitter.extract_subnet(prefix, count);

      return {
        base,
        prefix,
        count,
        extracted: extracted.map((item) => item.toString()),
        remaining: splitter.available_subnets().map((item) => item.toString()),
      };
    }, trace('Run Subnet Splitter', [
      'const splitter = new SubnetSplitter(baseCidr);',
      'const extracted = splitter.extract_subnet(prefix, count);',
      'const remaining = splitter.available_subnets();',
    ], () => ({
      base: els.splitterBase.value,
      prefix: els.splitterPrefix.value,
      count: els.splitterCount.value,
    })));
  }

  els.euiRun.addEventListener('click', runEuiLab);
  els.registryRegisterRun.addEventListener('click', runRegistryRegister);
  els.registryLookupRun.addEventListener('click', runRegistryLookup);
  els.registryClearRun.addEventListener('click', runRegistryClear);

  els.rfcRun.addEventListener('click', runRfcLab);
  els.validatorsRun.addEventListener('click', runValidatorsLab);
  els.splitterRun.addEventListener('click', runSplitterLab);

  bindEuiMode();
  bindMiscMode();

  return {
    runEuiLab,
    runRegistryRegister,
    runRegistryLookup,
    runRegistryClear,
    runRfcLab,
    runValidatorsLab,
    runSplitterLab,
  };
}
