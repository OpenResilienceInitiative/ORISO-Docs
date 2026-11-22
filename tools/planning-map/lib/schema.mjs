// Minimal JSON-schema subset validator (const, enum, type incl. arrays, required,
// properties, additionalProperties bool|schema, items, minimum, pattern).
// Dependency-free so the repo's `node --test` jobs need no install step.
const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const typeOk = (t, v) => {
  const actual = typeOf(v);
  return actual === t || (t === "number" && actual === "integer");
};

export function validate(schema, value, path = "$") {
  const errors = [];
  if ("const" in schema && value !== schema.const) errors.push(`${path}: expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => typeOk(t, value))) {
      errors.push(`${path}: expected ${types.join("|")}, got ${typeOf(value)}`);
      return errors;
    }
  }
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
  if (typeof value === "string" && schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: does not match ${schema.pattern}`);
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, `${path}[${i}]`)));
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) errors.push(`${path}: missing required "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) errors.push(...validate(schema.properties[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") errors.push(...validate(schema.additionalProperties, v, `${path}.${k}`));
    }
  }
  return errors;
}
