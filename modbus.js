const ModbusRTU = require("modbus-serial");

const client = new ModbusRTU();

async function connect() {
  await client.connectRTUBuffered("COM3", { baudRate: 9600 });
  console.log("RS485 bağlandı");
}

function float32(regs) {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(regs[0], 0);
  buf.writeUInt16BE(regs[1], 2);
  return buf.readFloatBE(0);
}

// -----------------------------
// MP110 OKUMA
// -----------------------------
async function readMP110(id) {
  try {
    client.setID(id);

    const p = await client.readHoldingRegisters(0x4000, 2);
    const cosphi = await client.readHoldingRegisters(0x400A, 2);
    const kwh = await client.readHoldingRegisters(0x5000, 2);
    const qind = await client.readHoldingRegisters(0x5002, 2);
    const qcap = await client.readHoldingRegisters(0x5004, 2);

    return {
      pTotalKw: float32(p.data),
      cosphi: float32(cosphi.data),
      pKwh: float32(kwh.data),
      qInd: float32(qind.data),
      qCap: float32(qcap.data)
    };

  } catch (err) {
    console.log("MP110 hata:", err.message);
    return null;
  }
}

// -----------------------------
// RG3 - 12 Kademe Okuma
// -----------------------------
async function readRG3(id) {
  try {
    client.setID(id);

    const arr = [];
    for (let k = 1; k <= 12; k++) {
      const coil = await client.readCoils(k, 1);
      arr.push(coil.data[0] ? 1 : 0);
    }
    return arr;

  } catch (err) {
    console.log("RG3 hata:", err.message);
    return Array(12).fill(0);
  }
}

module.exports = { connect, readMP110, readRG3 };
