import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
  url: "http://localhost",
});

(globalThis as Record<string, unknown>).document = dom.window.document;
(globalThis as Record<string, unknown>).window = dom.window;
(globalThis as Record<string, unknown>).navigator = dom.window.navigator;
(globalThis as Record<string, unknown>).Node = dom.window.Node;
(globalThis as Record<string, unknown>).Text = dom.window.Text;
(globalThis as Record<string, unknown>).Element = dom.window.Element;
(globalThis as Record<string, unknown>).HTMLElement = dom.window.HTMLElement;
(globalThis as Record<string, unknown>).NodeList = dom.window.NodeList;
(globalThis as Record<string, unknown>).DOMParser = dom.window.DOMParser;
