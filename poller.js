const ModbusRTU = require("modbus-serial");
const db = require("./db");

const client = new ModbusRTU();

async function connectPort() {
  try {
    await client.connectRTUBuffered("COM3", { baudRate: 9600 });
    console.log("Modbus bağlandı");
  } catch (err) {
    console.log("Bağlantı hatası:", err);
  }
}

function floatFromRegisters(regs) {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(regs[0], 0);
  buf.writeUInt16BE(regs[1], 2);
  return buf.readFloatBE(0);
}

// -----------------------------
// MP110 OKUMA
// -----------------------------
async function readMP110(slaveId) {
  try {
    client.setID(slaveId);

    const p = await client.readHoldingRegisters(0x4000, 2);   // Power (kW)
    const cosphi = await client.readHoldingRegisters(0x400A, 2);
    const kwh = await client.readHoldingRegisters(0x5000, 2);
    const qind = await client.readHoldingRegisters(0x5002, 2);
    const qcap = await client.readHoldingRegisters(0x5004, 2);

    return {
      pTotalKw: floatFromRegisters(p.data),
      cosphi: floatFromRegisters(cosphi.data),
      pKwh: floatFromRegisters(kwh.data),
      qInd: floatFromRegisters(qind.data),
      qCap: floatFromRegisters(qcap.data)
    };

  } catch (err) {
    console.log("MP110 okuma hatası:", err.message);
    return null;
  }
}

// -----------------------------
// RG3-12CS Kademe OKUMA
// -----------------------------
async function readRG3(slaveId) {
  try {
    client.setID(slaveId);

    const results = [];
    for (let k = 1;
