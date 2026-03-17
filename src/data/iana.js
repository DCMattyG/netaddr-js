export const IANA_IPV4 = [
  {
    "cidr": "0.0.0.0/8",
    "title": "This network",
    "rfc": "[RFC791], Section 3.2",
    "globallyReachable": false
  },
  {
    "cidr": "0.0.0.0/32",
    "title": "This host on this network",
    "rfc": "[RFC1122], Section 3.2.1.3",
    "globallyReachable": false
  },
  {
    "cidr": "10.0.0.0/8",
    "title": "Private-Use",
    "rfc": "[RFC1918]",
    "globallyReachable": false
  },
  {
    "cidr": "100.64.0.0/10",
    "title": "Shared Address Space",
    "rfc": "[RFC6598]",
    "globallyReachable": false
  },
  {
    "cidr": "127.0.0.0/8",
    "title": "Loopback",
    "rfc": "[RFC1122], Section 3.2.1.3",
    "globallyReachable": null
  },
  {
    "cidr": "169.254.0.0/16",
    "title": "Link Local",
    "rfc": "[RFC3927]",
    "globallyReachable": false
  },
  {
    "cidr": "172.16.0.0/12",
    "title": "Private-Use",
    "rfc": "[RFC1918]",
    "globallyReachable": false
  },
  {
    "cidr": "192.0.0.0/24",
    "title": "IETF Protocol Assignments",
    "rfc": "[RFC6890], Section 2.1",
    "globallyReachable": false
  },
  {
    "cidr": "192.0.0.0/29",
    "title": "IPv4 Service Continuity Prefix",
    "rfc": "[RFC7335]",
    "globallyReachable": false
  },
  {
    "cidr": "192.0.0.8/32",
    "title": "IPv4 dummy address",
    "rfc": "[RFC7600]",
    "globallyReachable": false
  },
  {
    "cidr": "192.0.0.9/32",
    "title": "Port Control Protocol Anycast",
    "rfc": "[RFC7723]",
    "globallyReachable": true
  },
  {
    "cidr": "192.0.0.10/32",
    "title": "Traversal Using Relays around NAT Anycast",
    "rfc": "[RFC8155]",
    "globallyReachable": true
  },
  {
    "cidr": "192.0.0.170/32",
    "title": "NAT64/DNS64 Discovery",
    "rfc": "[RFC8880][RFC7050], Section 2.2",
    "globallyReachable": false
  },
  {
    "cidr": "192.0.0.171/32",
    "title": "NAT64/DNS64 Discovery",
    "rfc": "[RFC8880][RFC7050], Section 2.2",
    "globallyReachable": false
  },
  {
    "cidr": "192.0.2.0/24",
    "title": "Documentation (TEST-NET-1)",
    "rfc": "[RFC5737]",
    "globallyReachable": false
  },
  {
    "cidr": "192.31.196.0/24",
    "title": "AS112-v4",
    "rfc": "[RFC7535]",
    "globallyReachable": true
  },
  {
    "cidr": "192.52.193.0/24",
    "title": "AMT",
    "rfc": "[RFC7450]",
    "globallyReachable": true
  },
  {
    "cidr": "192.88.99.0/24",
    "title": "Deprecated (6to4 Relay Anycast)",
    "rfc": "[RFC7526]",
    "globallyReachable": null
  },
  {
    "cidr": "192.88.99.2/32",
    "title": "6a44-relay anycast address",
    "rfc": "[RFC6751]",
    "globallyReachable": false
  },
  {
    "cidr": "192.168.0.0/16",
    "title": "Private-Use",
    "rfc": "[RFC1918]",
    "globallyReachable": false
  },
  {
    "cidr": "192.175.48.0/24",
    "title": "Direct Delegation AS112 Service",
    "rfc": "[RFC7534]",
    "globallyReachable": true
  },
  {
    "cidr": "198.18.0.0/15",
    "title": "Benchmarking",
    "rfc": "[RFC2544]",
    "globallyReachable": false
  },
  {
    "cidr": "198.51.100.0/24",
    "title": "Documentation (TEST-NET-2)",
    "rfc": "[RFC5737]",
    "globallyReachable": false
  },
  {
    "cidr": "203.0.113.0/24",
    "title": "Documentation (TEST-NET-3)",
    "rfc": "[RFC5737]",
    "globallyReachable": false
  },
  {
    "cidr": "240.0.0.0/4",
    "title": "Reserved",
    "rfc": "[RFC1112], Section 4",
    "globallyReachable": false
  }
];

export const IANA_IPV6 = [
  {
    "cidr": "::1/128",
    "title": "Loopback Address",
    "rfc": "[RFC4291]",
    "globallyReachable": false
  },
  {
    "cidr": "::/128",
    "title": "Unspecified Address",
    "rfc": "[RFC4291]",
    "globallyReachable": false
  },
  {
    "cidr": "::ffff:0:0/96",
    "title": "IPv4-mapped Address",
    "rfc": "[RFC4291]",
    "globallyReachable": false
  },
  {
    "cidr": "64:ff9b::/96",
    "title": "IPv4-IPv6 Translat.",
    "rfc": "[RFC6052]",
    "globallyReachable": true
  },
  {
    "cidr": "64:ff9b:1::/48",
    "title": "IPv4-IPv6 Translat.",
    "rfc": "[RFC8215]",
    "globallyReachable": false
  },
  {
    "cidr": "100::/64",
    "title": "Discard-Only Address Block",
    "rfc": "[RFC6666]",
    "globallyReachable": false
  },
  {
    "cidr": "100:0:0:1::/64",
    "title": "Dummy IPv6 Prefix",
    "rfc": "[RFC9780]",
    "globallyReachable": false
  },
  {
    "cidr": "2001::/23",
    "title": "IETF Protocol Assignments",
    "rfc": "[RFC2928]",
    "globallyReachable": null
  },
  {
    "cidr": "2001:1::1/128",
    "title": "Port Control Protocol Anycast",
    "rfc": "[RFC7723]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:1::2/128",
    "title": "Traversal Using Relays around NAT Anycast",
    "rfc": "[RFC8155]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:1::3/128",
    "title": "DNS-SD Service Registration Protocol Anycast",
    "rfc": "[RFC9665]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:2::/48",
    "title": "Benchmarking",
    "rfc": "[RFC5180][RFC Errata 1752]",
    "globallyReachable": false
  },
  {
    "cidr": "2001:3::/32",
    "title": "AMT",
    "rfc": "[RFC7450]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:4:112::/48",
    "title": "AS112-v6",
    "rfc": "[RFC7535]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:10::/28",
    "title": "Deprecated (previously ORCHID)",
    "rfc": "[RFC4843]",
    "globallyReachable": null
  },
  {
    "cidr": "2001:20::/28",
    "title": "ORCHIDv2",
    "rfc": "[RFC7343]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:30::/28",
    "title": "Drone Remote ID Protocol Entity Tags (DETs) Prefix",
    "rfc": "[RFC9374]",
    "globallyReachable": true
  },
  {
    "cidr": "2001:db8::/32",
    "title": "Documentation",
    "rfc": "[RFC3849]",
    "globallyReachable": false
  },
  {
    "cidr": "2002::/16",
    "title": "6to4",
    "rfc": "[RFC3056]",
    "globallyReachable": null
  },
  {
    "cidr": "2620:4f:8000::/48",
    "title": "Direct Delegation AS112 Service",
    "rfc": "[RFC7534]",
    "globallyReachable": true
  },
  {
    "cidr": "3fff::/20",
    "title": "Documentation",
    "rfc": "[RFC9637]",
    "globallyReachable": false
  },
  {
    "cidr": "5f00::/16",
    "title": "Segment Routing (SRv6) SIDs",
    "rfc": "[RFC9602]",
    "globallyReachable": false
  },
  {
    "cidr": "fe80::/10",
    "title": "Link-Local Unicast",
    "rfc": "[RFC4291]",
    "globallyReachable": false
  }
];
