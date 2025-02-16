import { CTRMemory } from "libctr";
import { SigilKSMImport } from "#ksm/ksm-import";
import { SigilKSMOpCode } from "#ksm/ksm-opcode";
import { SigilKSMFunction } from "#ksm/ksm-function";
import { SigilKSMVariable } from "#ksm/ksm-variable";
import { SigilKSMInstruction } from "#ksm/ksm-instruction";
import type { SigilKSMContext, SigilKSMExpression } from "#ksm/ksm-context";
import exprsizeof from "./ksm-exprsizeof";

type SigilKSMCallCallee = SigilKSMImport | SigilKSMFunction;

type SigilKSMCallArgument =
  | SigilKSMImport
  | SigilKSMFunction
  | SigilKSMVariable
  | SigilKSMExpression;

class SigilKSMCallInstruction extends SigilKSMInstruction {
  public callee: SigilKSMCallCallee;
  public arguments: SigilKSMCallArgument[];

  public constructor() {
    super();

    this.arguments = [];
    this.callee = new SigilKSMFunction();
  }

  public override get const(): boolean {
    return this.arguments.every((arg) => arg instanceof SigilKSMVariable);
  }

  public override get opcode(): number {
    return SigilKSMOpCode.OPCODE_CALL;
  }

  protected _build(buffer: CTRMemory, ctx: SigilKSMContext): void {
    buffer.u32(this.callee.id);

    for (const argument of this.arguments) {
      if(Array.isArray(argument)) {
        ctx.buildExpr(buffer, argument);
        continue;
      }

      buffer.u32(argument.id);
    }

    buffer.u32(SigilKSMOpCode.OPCODE_CALL_END);
  }

  protected _parse(buffer: CTRMemory, ctx: SigilKSMContext): void {
    const isConst = ctx.const;

    let id = buffer.u32();
    this.callee = ctx.fn(id, true);

    id = buffer.u32();

    while (id !== SigilKSMOpCode.OPCODE_CALL_END) {
      if (isConst) {
        try {
          this.arguments.push(ctx.var(id));
        } catch {
          this.arguments.push(ctx.fn(id, true));
        }
      } else {
        this.arguments.push(ctx.parseExpr(buffer, ctx.intr(id) || ctx.symb(id)));
      }

      id = buffer.u32();
    }
  }

  protected override _sizeof(): number {
    let sizeof = 0;

    sizeof += CTRMemory.U32_SIZE; // callee id

    for (const argument of this.arguments) {
      sizeof += Array.isArray(argument) ? exprsizeof(argument) : CTRMemory.U32_SIZE;
    }

    sizeof += CTRMemory.U32_SIZE; // end
    return sizeof;
  }
}

export { SigilKSMCallInstruction, SigilKSMCallInstruction as KSMCallInstruction };

export type {
  SigilKSMCallCallee,
  SigilKSMCallCallee as KSMCallCallee,
  SigilKSMCallArgument,
  SigilKSMCallArgument as KSMCallArgument
};
