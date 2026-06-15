# Magic Network

Magic Network è una web app locale per visualizzare e gestire la tua rete di casa.

## Cosa fa

- Mostra il router e i dispositivi collegati come schema visivo.
- Permette di aggiungere, modificare, cancellare e spostare i nodi della rete.
- Mostra lo stato online/offline/sconosciuto dei dispositivi.
- Consente di importare/esportare la rete e salvare il layout del diagramma.
- Supporta scansione degli IP locali e aggiunta rapida di dispositivi trovati.

## Requisiti

- Node.js 18 o superiore
- Browser moderno

## Avvio

1. Apri un terminale nella cartella del progetto.
2. Installa le dipendenze:

```bash
npm install
```

3. Avvia l'app:

```bash
npm start
```

4. Apri nel browser:

```text
http://localhost:3000
```

## Uso base

- Modifica il router o aggiungi nuovi dispositivi.
- Usa la lista laterale per cercare e filtrare per nome o IP.
- Trascina i nodi sul canvas per organizzare il layout.
- Salva il layout dopo le modifiche.
- Usa la scansione IP per creare nodi dai dispositivi rilevati.

## Stato e MAC address

- Lo stato online/offline viene rilevato dal backend con `ping` e aggiornato automaticamente ogni 60 secondi.
- Il MAC viene letto da ARP, da `nmap` se installato e, per il computer che esegue l'app, direttamente dalla scheda di rete locale.
- Se un dispositivo blocca il ping ma compare in ARP o `nmap`, viene comunque considerato online.
- Su Windows la tabella ARP spesso non contiene il MAC del PC stesso: in quel caso Magic Network usa il MAC esposto da Node.js tramite le interfacce di rete.
- Su un server Linux domestico il rilevamento funziona allo stesso modo; installare `nmap` può migliorare la qualità dei risultati per i dispositivi della LAN.

## Accesso dalla LAN

Se il dispositivo è connesso alla rete, puoi aprire l'app anche da altri dispositivi con l'indirizzo del server, ad esempio:

```text
http://192.168.1.25:3000
```

## Password opzionale

Per proteggere l'app con una password locale, imposta `APP_PASSWORD` prima di avviare:

```bash
APP_PASSWORD=una-password-locale npm start
```

Su PowerShell:

```powershell
$env:APP_PASSWORD="una-password-locale"; npm start
```

## Consigli

- Usa l'app solo in rete locale.
- Non esporre il server su Internet.
- Imposta la password se la rete è condivisa con altre persone.
