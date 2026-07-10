export interface IdGeneratorPort {
  nextId(entity?: string): string;
  nextCode(prefix?: string): string;
}

