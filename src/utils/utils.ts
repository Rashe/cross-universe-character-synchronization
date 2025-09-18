export function getNestedValue(obj: any, path: string): any {
  let current: any = obj;
  const parts = path.split(".");
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (part.endsWith("[]")) {
      const key = part.slice(0, -2);
      if (!Array.isArray(current?.[key])) return undefined;
      const restPath = parts.slice(i + 1).join(".");
      const result = current[key]
        .map((el: any) =>
          restPath ? getNestedValue(el, restPath) : el
        )
        .filter((v: any) => v !== undefined);
      return result;
    } else {
      if (current == null) return undefined;
      current = current[part];
    }
  }
  return current;
}
