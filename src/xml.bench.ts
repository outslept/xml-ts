import { run, bench, summary, barplot, do_not_optimize } from "mitata";
import { XMLBuilder } from "fast-xml-parser";
import { toXML } from "jstoxml";
import nodeXml from "xml";
import { create } from "xmlbuilder2";
import xml2js from "xml2js";
import { renderXML } from "./xml.ts";

const ITEM_COUNT = 50;

const unxmlInput = {
  rss: {
    "@version": "2.0",
    channel: {
      title: "Benchmark & Feed",
      link: "https://example.com",
      item: Array.from({ length: ITEM_COUNT }, (_, i) => ({
        "@id": i,
        title: `Post #${i} <"quoted" & 'escaped'>`,
        link: `https://example.com/posts/${i}`,
        description: { $cdata: `<p>Body ${i}</p>` },
      })),
    },
  },
};

const fxpBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  cdataPropName: "$cdata",
  suppressEmptyNode: true,
});

const jstoxmlInput = {
  _name: "rss",
  _attrs: { version: "2.0" },
  _content: {
    channel: [
      { title: "Benchmark & Feed" },
      { link: "https://example.com" },
      ...Array.from({ length: ITEM_COUNT }, (_, i) => ({
        _name: "item",
        _attrs: { id: i },
        _content: {
          title: `Post #${i} <"quoted" & 'escaped'>`,
          link: `https://example.com/posts/${i}`,
          description: `<![CDATA[<p>Body ${i}</p>]]>`,
        },
      })),
    ],
  },
};

const nodeXmlInput = [
  {
    rss: [
      { _attr: { version: "2.0" } },
      {
        channel: [
          { title: "Benchmark & Feed" },
          { link: "https://example.com" },
          ...Array.from({ length: ITEM_COUNT }, (_, i) => ({
            item: [
              { _attr: { id: i } },
              { title: `Post #${i} <"quoted" & 'escaped'>` },
              { link: `https://example.com/posts/${i}` },
              { description: { _cdata: `<p>Body ${i}</p>` } },
            ],
          })),
        ],
      },
    ],
  },
];

const xml2jsBuilder = new xml2js.Builder({ headless: false, renderOpts: { pretty: false } });
const xml2jsInput = {
  rss: {
    $: { version: "2.0" },
    channel: {
      title: "Benchmark & Feed",
      link: "https://example.com",
      item: Array.from({ length: ITEM_COUNT }, (_, i) => ({
        $: { id: i },
        title: `Post #${i} <"quoted" & 'escaped'>`,
        link: `https://example.com/posts/${i}`,
        description: `<p>Body ${i}</p>`,
      })),
    },
  },
};

barplot(() => {
  summary(() => {
    bench("renderXML (local)", () => {
      return do_not_optimize(renderXML(unxmlInput, { declaration: true }));
    });

    bench("fast-xml-parser", () => {
      return do_not_optimize(
        '<?xml version="1.0" encoding="UTF-8"?>' + fxpBuilder.build(unxmlInput),
      );
    });

    bench("jstoxml", () => {
      return do_not_optimize(toXML(jstoxmlInput, { header: true }));
    });

    bench("xml (dylang/node-xml)", () => {
      return do_not_optimize(nodeXml(nodeXmlInput, { declaration: true }));
    });

    bench("xmlbuilder2", () => {
      return do_not_optimize(create(unxmlInput).end({ headless: false }));
    });

    bench("xml2js", () => {
      return do_not_optimize(xml2jsBuilder.buildObject(xml2jsInput));
    });
  });
});

await run();
