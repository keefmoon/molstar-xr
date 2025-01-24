import * as React from 'react';
import { PluginUIComponent } from './base';
import { PluginContext } from '../mol-plugin/context';
import { PluginUIContext } from './context';
import { PluginCommands } from '../mol-plugin/commands';

interface XRButtonProps {
    plugin: PluginUIContext;
}

export class XRButton extends PluginUIComponent<XRButtonProps> {
    handleClick = async () => {
        const { plugin } = this.props;
        const xr = plugin.canvas3d?.webxr;
        if (!xr) {
            console.error("WebXR is not supported by the browser");
            return;
        }

    handleClick = async () => {
        const { plugin } = this.props;
    handleClick = async () => {
        const { plugin } = this.props;
        const xr = plugin.canvas3d?.webxr;
        const gl = plugin.canvas3d?.webgl;
        const renderer = plugin.canvas3d?.renderer;

        if (!xr) {
            console.error("WebXR is not supported by the browser");
            return;
        }

        xr.requestXRSession().then(async(session) => {
            if (!session) {
                console.error("Could not initialize XR session");
                return;
            }
            if(session.mode == 'immersive-vr'){
                
                await gl.xr.setSession(session);
                await session.setBaseLayer(new XRWebGLLayer(gl, gl.xr.session));

                const xrRefSpace = await gl.xr.session.requestReferenceSpace('local');
                const xrHitTestSource = await gl.xr.session.requestHitTestSource({ space: 'viewer' });

                gl.xr.session.requestAnimationFrame((time: any, xrFrame: any) => {
                    gl.xr.session.requestAnimationFrame(xrFrame);
                    // render is only called here, so lets call it
                    if (xrHitTestSource && xrRefSpace)
                    {
                        renderer.render(gl.xr.session, xrRefSpace, xrHitTestSource);
                    }
                })
            }
        });
    };

    render() {
        return <button onClick={this.handleClick}>View in XR</button>;
    }
}
