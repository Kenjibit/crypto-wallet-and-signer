import { Card } from '@btc-wallet/ui';

export default function TransactionDetails() {
  const steps = [
    {
      number: 1,
      title: 'Transaction Inputs (UTXOs)',
      description:
        'Each transaction input references an unspent transaction output (UTXO) that you control.',
      points: [
        'TXID: The transaction ID where the UTXO was created',
        'Vout: The output index in that transaction',
        'ScriptSig: (Empty for unsigned transactions)',
      ],
    },
    {
      number: 2,
      title: 'Transaction Outputs',
      description: 'Outputs specify where bitcoins are being sent:',
      points: [
        'Recipient Output: Amount sent to the destination address',
        'Change Output: Remaining funds returned to your address',
        'ScriptPubKey: Locking script for the recipient',
      ],
    },
    {
      number: 3,
      title: 'Transaction Fees',
      description:
        'Calculated as: Total Inputs - (Recipient Amount + Change Amount)',
      points: ['Miners collect fees to include transactions in blocks'],
    },
  ];

  return (
    <Card title="Transaction Structure Details" icon="fas fa-info-circle">
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.number} className="step">
            <div className="step-number">{step.number}</div>
            <div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="mb-3">{step.description}</p>
              <ul className="space-y-2 pl-5">
                {step.points.map((point, idx) => (
                  <li key={idx} className="list-disc">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
