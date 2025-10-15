import * as PIXI from 'pixi.js';
import {SlotMachine} from '../slots/SlotMachine';
import {AssetLoader} from '../utils/AssetLoader';
import {Sound} from '../utils/Sound';

export class UI {
    public container: PIXI.Container;
    private app: PIXI.Application;
    private slotMachine: SlotMachine;
    private spinButton!: PIXI.Sprite;
    private spinButtonShadow!: PIXI.Sprite;

    constructor(app: PIXI.Application, slotMachine: SlotMachine) {
        this.app = app;
        this.slotMachine = slotMachine;
        this.container = new PIXI.Container();

        this.createSpinButton();

        // Reset button and shadow to original size when spin finishes
        this.slotMachine.container.on('spin:end', () => {
            if (this.spinButton) this.spinButton.scale.set(1.0);
            if (this.spinButtonShadow) this.spinButtonShadow.scale.set(1.0);
        });

        this.createActionButtons();
    }

    private createSpinButton(): void {
        try {
            const tex = AssetLoader.getTexture('button_spin.png');

            // Create a simple shadow sprite behind the spin button
            this.spinButtonShadow = new PIXI.Sprite(tex);
            this.spinButtonShadow.anchor.set(0.5);
            this.spinButtonShadow.x = this.app.screen.width / 2;
            this.spinButtonShadow.y = this.app.screen.height - 50 + 10;
            this.spinButtonShadow.width = 150;
            this.spinButtonShadow.height = 80;
            this.spinButtonShadow.tint = 0x000000;
            this.spinButtonShadow.alpha = 0.35;
            this.spinButtonShadow.interactive = false;

            // Actual spin button on top
            this.spinButton = new PIXI.Sprite(tex);
            this.spinButton.anchor.set(0.5);
            this.spinButton.x = this.app.screen.width / 2;
            this.spinButton.y = this.app.screen.height - 50;
            this.spinButton.width = 150;
            this.spinButton.height = 80;

            this.spinButton.interactive = true;
            this.spinButton.cursor = 'pointer';

            this.spinButton.on('pointerdown', this.onSpinButtonClick.bind(this));
            this.spinButton.on('pointerover', this.onButtonOver.bind(this));
            this.spinButton.on('pointerout', this.onButtonOut.bind(this));

            // Add shadow first, then the button so it renders above the shadow
            this.container.addChild(this.spinButtonShadow, this.spinButton);

            this.slotMachine.setSpinButton(this.spinButton);
        } catch (error) {
            console.error('Error creating spin button:', error);
        }
    }

    private onSpinButtonClick(): void {
        Sound.play('Spin button');

        // Press feedback: shrink both button and shadow so the shadow follows the click effect
        if (this.spinButton) this.spinButton.scale.set(0.95);
        if (this.spinButtonShadow) this.spinButtonShadow.scale.set(0.75);

        this.slotMachine.spin();
    }

    private onButtonOver(event: PIXI.FederatedPointerEvent): void {
        (event.currentTarget as PIXI.Sprite).scale.set(1.05);
        if (this.spinButtonShadow) this.spinButtonShadow.scale.set(1.05);
    }

    private onButtonOut(event: PIXI.FederatedPointerEvent): void {
        (event.currentTarget as PIXI.Sprite).scale.set(1.0);
        if (this.spinButtonShadow) this.spinButtonShadow.scale.set(1.0);
    }

    private createActionButtons(): void {
        const x = this.app.screen.width - 180;
        const yBase = this.app.screen.height / 2 - 100;
        const gap = 60;

        const btn1 = this.createTextButton('Win: Straight (LR/TB)', x, yBase, () => {
            this.slotMachine.forceStraightWinInAnyColumn();
        });
        const btn2 = this.createTextButton('Win: Diagonal', x, yBase + gap, () => {
            this.slotMachine.forceRandomDiagonalWin();
        });
        const btn3 = this.createTextButton('Win: Any Line', x, yBase + 2 * gap, () => {
            this.slotMachine.forceRandomStraightConnectingLineWin();
        });

        this.container.addChild(btn1, btn2, btn3);
    }

    private createTextButton(label: string, x: number, y: number, onClick: () => void): PIXI.Container {
        const cont = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x333333);
        bg.drawRoundedRect(0, 0, 180, 44, 8);
        bg.endFill();
        bg.lineStyle({width: 2, color: 0xffffff, alpha: 0.5});
        bg.drawRoundedRect(0, 0, 180, 44, 8);

        const text = new PIXI.Text(label, new PIXI.TextStyle({
            fill: 0xffffff,
            fontSize: 16,
            fontWeight: 'bold',
            align: 'center'
        }));
        text.anchor.set(0.5);
        text.x = 90;
        text.y = 22;

        cont.addChild(bg, text);
        cont.x = x;
        cont.y = y;
        cont.interactive = true;
        cont.cursor = 'pointer';
        cont.on('pointerdown', onClick);
        cont.on('pointerover', () => {
            cont.scale.set(1.05);
        });
        cont.on('pointerout', () => {
            cont.scale.set(1.0);
        });
        return cont;
    }
}
