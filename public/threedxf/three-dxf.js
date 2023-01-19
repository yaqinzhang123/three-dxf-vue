//three-dxf v0.3.0
import * as THREE from './three'
import orbitControls from './OrbitControls'
import $ from 'jquery'
const OrbitControls=orbitControls(THREE)
/**
 * Returns the angle in radians of the vector (p1,p2). In other words, imagine
 * putting the base of the vector at coordinates (0,0) and finding the angle
 * from vector (1,0) to (p1,p2).
 * @param  {Object} p1 start point of the vector
 * @param  {Object} p2 end point of the vector
 * @return {Number} the angle
 */
THREE.Math.angle2 = function (p1, p2) {
    var v1 = new THREE.Vector2(p1.x, p1.y);
    var v2 = new THREE.Vector2(p2.x, p2.y);
    v2.sub(v1); // sets v2 to be our chord
    v2.normalize();
    if (v2.y < 0) return -Math.acos(v2.x);
    return Math.acos(v2.x);
};


THREE.Math.polar = function (point, distance, angle) {
    var result = {};
    result.x = point.x + distance * Math.cos(angle);
    result.y = point.y + distance * Math.sin(angle);
    return result;
};

/**
 * Calculates points for a curve between two points
 * @param startPoint - the starting point of the curve
 * @param endPoint - the ending point of the curve
 * @param bulge - a value indicating how much to curve
 * @param segments - number of segments between the two given points
 */
THREE.BulgeGeometry = function (startPoint, endPoint, bulge, segments) {

    var vertex, i,
        center, p0, p1, angle,
        radius, startAngle,
        thetaAngle;

    THREE.Geometry.call(this);

    this.startPoint = p0 = startPoint ? new THREE.Vector2(startPoint.x, startPoint.y) : new THREE.Vector2(0, 0);
    this.endPoint = p1 = endPoint ? new THREE.Vector2(endPoint.x, endPoint.y) : new THREE.Vector2(1, 0);
    this.bulge = bulge = bulge || 1;

    angle = 4 * Math.atan(bulge);
    radius = p0.distanceTo(p1) / 2 / Math.sin(angle / 2);
    center = THREE.Math.polar(startPoint, radius, THREE.Math.angle2(p0, p1) + (Math.PI / 2 - angle / 2));

    this.segments = segments = segments || Math.max(Math.abs(Math.ceil(angle / (Math.PI / 18))), 6); // By default want a segment roughly every 10 degrees
    startAngle = THREE.Math.angle2(center, p0);
    thetaAngle = angle / segments;


    this.vertices.push(new THREE.Vector3(p0.x, p0.y, 0));

    for (i = 1; i <= segments - 1; i++) {

        vertex = THREE.Math.polar(center, Math.abs(radius), startAngle + thetaAngle * i);

        this.vertices.push(new THREE.Vector3(vertex.x, vertex.y, 0));

    }

};

THREE.BulgeGeometry.prototype = Object.create(THREE.Geometry.prototype);



/**
 * Viewer class for a dxf object.
 * @param {Object} data - the dxf object
 * @param {Object} parent - the parent element to which we attach the rendering canvas
 * @param {Number} width - width of the rendering canvas in pixels
 * @param {Number} height - height of the rendering canvas in pixels
 * @param {Object} font - a font loaded with THREE.FontLoader 
 * @constructor
 */


export function Viewer(data, parent, width, height,callback) {
    var $parent = $(parent);
    var font;
    var loader= new THREE.FontLoader();
    loader.load( '../fonts/zhongsong_regular.typeface.json', function ( response ) {
        font = response;
   
    createLineTypeShaders(data);

    var scene = new THREE.Scene();
    var res_entities = {}, layer_num = {}, group = new THREE.Group(), textgeo = [];
    // Create scene from dxf object (data)
    var i, entity, obj, min_x, min_y, min_z, max_x, max_y, max_z;
    var dims = {
        min: { x: false, y: false, z: false },
        max: { x: false, y: false, z: false }
    };
    var c_flag = true
    // console.log("befor:data.entities:", data)

    //console.log("after:data.entities",data)
    // var resd = []
    // for (var i in res_data) {
    //     switch (i) {
    //         case 'LWPOLYLINE':
    //         case 'LINE':
    //         case 'POLYLINE':
    //             resd = resd.concat(res_data[i])
    //             break;
    //     }
    // }
    //data.entities = resd
    // console.log(data)
    for (i = 0; i < data.entities.length; i++) {
        entity = data.entities[i];
        if (entity.type === 'DIMENSION') {
            if (entity.block) {
                var block = data.blocks[entity.block];
                if (!block) {
                    console.error('Missing referenced block "' + entity.block + '"');
                    continue;
                }
                for (var j = 0; j < block.entities.length; j++) {
                    obj = drawEntity(block.entities[j], data,font,scene);
                }
            } else {
                console.log('WARNING: No block for DIMENSION entity');
            }
        } else {
            obj = drawEntity(entity, data,font,scene);
        }

        if (obj) {
            var bbox = new THREE.Box3().setFromObject(obj);
            if (bbox.min.x && ((dims.min.x === false) || (dims.min.x > bbox.min.x))) dims.min.x = bbox.min.x;
            if (bbox.min.y && ((dims.min.y === false) || (dims.min.y > bbox.min.y))) dims.min.y = bbox.min.y;
            if (bbox.min.z && ((dims.min.z === false) || (dims.min.z > bbox.min.z))) dims.min.z = bbox.min.z;
            if (bbox.max.x && ((dims.max.x === false) || (dims.max.x < bbox.max.x))) dims.max.x = bbox.max.x;
            if (bbox.max.y && ((dims.max.y === false) || (dims.max.y < bbox.max.y))) dims.max.y = bbox.max.y;
            if (bbox.max.z && ((dims.max.z === false) || (dims.max.z < bbox.max.z))) dims.max.z = bbox.max.z;
            renderGeometry(obj,layer_num,res_entities,scene)
        }
        obj = null;
    }
    //console.log(res_entities)
    // myLine = new THREE.BufferGeometry();
    // myLine.setIndex( indices );
    // myLine.addAttribute( 'position', new THREE.Float32BufferAttribute( mPoints, 3 ) );
    // myLine.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    // myLine.computeBoundingSphere();

    // var mesh = new THREE.LineSegments( myLine, new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } ) );

    // scene.add(mesh);
    var line_material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors })
    //var dash_material = new THREE.LineDashedMaterial({ vertexColors: THREE.VertexColors,gapSize: 1, dashSize: 1});
    var dash_material = new THREE.LineDashedMaterial({ vertexColors: THREE.VertexColors, dashSize: 3, gapSize: 1, linewidth: 2 })
    for (var key in res_entities) {
        //console.log(key)
        res_entities[key]
        var mesh, ent = new THREE.BufferGeometry();

        if (key == 'Dashed') {
            ent.setIndex(res_entities[key].indices);
            ent.addAttribute('position', new THREE.Float32BufferAttribute(res_entities[key].points, 3));
            ent.addAttribute('color', new THREE.Float32BufferAttribute(res_entities[key].colors, 3));
            ent.computeBoundingBox();
            mesh = new THREE.LineSegments(ent, dash_material);
            mesh.computeLineDistances();
            console.log(ent)
        }
        else {

            ent.setIndex(res_entities[key].indices);
            ent.addAttribute('position', new THREE.Float32BufferAttribute(res_entities[key].points, 3));
            ent.addAttribute('color', new THREE.Float32BufferAttribute(res_entities[key].colors, 3));
            //ent.computeBoundingSphere();
            mesh = new THREE.LineSegments(ent, line_material);
        }

        mesh.userData = { layer: key }
        scene.add(mesh);
    }
    //geometry
    //scene.add(group);
    //scene.add(new THREE.Mesh(textgeo, new THREE.MeshLambertMaterial({color: 0x00ff00, transparent: true, opacity: 0.8})));
    console.log(scene.children.length, textgeo.length)
    console.log(res_entities)
    width = width || $parent.innerWidth();
    height = height || $parent.innerHeight();
    var aspectRatio = width / height;

    var upperRightCorner = { x: dims.max.x, y: dims.max.y };
    var lowerLeftCorner = { x: dims.min.x, y: dims.min.y };

    // Figure out the current viewport extents
    var vp_width = upperRightCorner.x - lowerLeftCorner.x;
    var vp_height = upperRightCorner.y - lowerLeftCorner.y;
    var center = center || {
        x: vp_width / 2 + lowerLeftCorner.x,
        y: vp_height / 2 + lowerLeftCorner.y
    };

    // Fit all objects into current ThreeDXF viewer
    var extentsAspectRatio = Math.abs(vp_width / vp_height);
    if (aspectRatio > extentsAspectRatio) {
        vp_width = vp_height * aspectRatio;
    } else {
        vp_height = vp_width / aspectRatio;
    }

    var viewPort = {
        bottom: -vp_height / 2,
        left: -vp_width / 2,
        top: vp_height / 2,
        right: vp_width / 2,
        center: {
            x: center.x,
            y: center.y
        }
    };
    console.log(viewPort, upperRightCorner, lowerLeftCorner)
    var camera = new THREE.OrthographicCamera(viewPort.left, viewPort.right, viewPort.top, viewPort.bottom, 1, 19);
    camera.position.z = 10;
    camera.position.x = viewPort.center.x;
    camera.position.y = viewPort.center.y;

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor(0xfffffff, 1);

    $parent.append(renderer.domElement);
    $parent.show();
    callback();
    var controls = new OrbitControls(camera, parent);
    controls.target.x = camera.position.x;
    controls.target.y = camera.position.y;
    controls.target.z = 0;
    controls.zoomSpeed = 3;

    // Uncommend this to disable rotation (does not make much sense with 2D drawings).
    //controls.enableRotate = false;

    controls.addEventListener('change', ()=>{
        renderer.render( scene, camera );
    });
    renderer.render(scene, camera);
    controls.update();

    $parent.on('click', function (event) {
        var $el = $(renderer.domElement);

        var vector = new THREE.Vector3(
            ((event.pageX - $el.offset().left) / $el.innerWidth()) * 2 - 1,
            -((event.pageY - $el.offset().top) / $el.innerHeight()) * 2 + 1,
            0.5);
        vector.unproject(camera);

        var dir = vector.sub(camera.position).normalize();

        var distance = -camera.position.z / dir.z;

        var pos = camera.position.clone().add(dir.multiplyScalar(distance));
        scene.children.map(function (e) {
            e.visible = true
        })
        renderer.render(scene, camera)
        // console.log(pos.x, pos.y); // Position in cad that is clicked
    });

  
        var originalWidth = renderer.domElement.width;
        var originalHeight = renderer.domElement.height;

        var hscale = width / originalWidth;
        var vscale = height / originalHeight;


        camera.top = (vscale * camera.top);
        camera.bottom = (vscale * camera.bottom);
        camera.left = (hscale * camera.left);
        camera.right = (hscale * camera.right);

        //        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        renderer.setClearColor(0xfffffff, 1);
        renderer.render(scene, camera);
     return false;
});

}
export function drawEntity(entity, data,font,scene) {
    var mesh;
    if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
        mesh = drawArc(entity, data);
    } else if (entity.type === 'LWPOLYLINE' || entity.type === 'LINE' || entity.type === 'POLYLINE') {
        mesh = drawLine(entity, data);
    } else if (entity.type === 'TEXT') {
        mesh = drawText(entity, data,font);
    } else if (entity.type === 'SOLID') {
        mesh = drawSolid(entity, data);
    } else if (entity.type === 'POINT') {
        mesh = drawPoint(entity, data,scene);
    } else if (entity.type === 'INSERT') {
        mesh = drawBlock(entity, data,scene);
    } else if (entity.type === 'SPLINE') {
        mesh = drawSpline(entity, data);
    } else if (entity.type === 'MTEXT') {
        mesh = drawMtext(entity, data,font);
        mesh.userData.text = entity.text
    } else if (entity.type === 'ELLIPSE') {
        mesh = drawEllipse(entity, data);
    }
    else {
        console.log("Unsupported Entity Type: " + entity.type);
    }
    if (mesh) {
        mesh.userData.layer = entity.layer
        mesh.userData.type = entity.type
        // if(entity.lineType){
        //     mesh.userData.lineType = data.tables.lineType.lineTypes[entity.lineType];
        // } 
        if (entity.color) {
            mesh.userData.color = entity.color
        }
    }
    return mesh;
}
export function drawEllipse(entity, data) {
    var color = getColor(entity, data);

    var xrad = Math.sqrt(Math.pow(entity.majorAxisEndPoint.x, 2) + Math.pow(entity.majorAxisEndPoint.y, 2));
    var yrad = xrad * entity.axisRatio;
    var rotation = Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x);

    var curve = new THREE.EllipseCurve(
        entity.center.x, entity.center.y,
        xrad, yrad,
        entity.startAngle, entity.endAngle,
        false, // Always counterclockwise
        rotation
    );

    var points = curve.getPoints(50);
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });

    // Create the final object to add to the scene
    var ellipse = new THREE.Line(geometry, material);
    return ellipse;
}

export function drawMtext(entity, data,font) {
    var color = getColor(entity, data);
    var str = entity.text.split("{").map(function (e) {
        var tex = e.split(";")
        return tex[tex.length - 1].replace("}", "")
    }).join(' ')
    if (!str) {
        console.log(entity.text)
        str = entity.text
    }
    // if(entity.text.indexOf("华夏") == 0){
    //     console.log(entity.text,entity)
    // }
    //console.log(entity.text,tex[tex.length - 1].replace("}",""))
    var rotate = 0
    if (entity.rotate) {
        rotate = entity.rotate
    }
    else {
        if (entity.tan) {
            rotate = Math.atan(entity.atan / entity.tan)
        }
    }

    var geometry = new THREE.TextBufferGeometry(str, {
        font: font,
        size: entity.height * (4 / 5),
        curveSegments: 1,
        height: 1
    });
    //geometry.computeBoundingBox();
    //geometry.computeVertexNormals();
    var material = new THREE.MeshBasicMaterial({ color: color });
    var text = new THREE.Mesh(geometry, material);

    // Measure what we rendered.
    var measure = new THREE.Box3();
    measure.setFromObject(text);

    var textWidth = measure.max.x - measure.min.x;

    // If the text ends up being wider than the box, it's supposed
    // to be multiline. Doing that in threeJS is overkill.
    if (textWidth > entity.width) {
        //console.log("Can't render this multipline MTEXT entity, sorry.", entity);
        //return undefined;
        text.position.x = entity.position.x;
        text.position.y = entity.position.y;
    }

    text.position.z = 0;
    //if(entity.text.indexOf("华夏") == 0){
    text.rotation.z = rotate
    //console.log(rotate)
    //}

    switch (entity.attachmentPoint) {
        case 1:
            // Top Left
            text.position.x = entity.position.x;
            text.position.y = entity.position.y - entity.height;
            break;
        case 2:
            // Top Center
            text.position.x = entity.position.x - textWidth / 2;
            text.position.y = entity.position.y - entity.height;
            break;
        case 3:
            // Top Right
            text.position.x = entity.position.x - textWidth;
            text.position.y = entity.position.y - entity.height;
            break;

        case 4:
            // Middle Left
            text.position.x = entity.position.x;
            text.position.y = entity.position.y - entity.height / 2;
            break;
        case 5:
            // Middle Center
            text.position.x = entity.position.x - textWidth / 2;
            text.position.y = entity.position.y - entity.height / 2;
            break;
        case 6:
            // Middle Right
            text.position.x = entity.position.x - textWidth;
            text.position.y = entity.position.y - entity.height / 2;
            break;

        case 7:
            // Bottom Left
            text.position.x = entity.position.x;
            text.position.y = entity.position.y;
            break;
        case 8:
            // Bottom Center
            text.position.x = entity.position.x - textWidth / 2;
            text.position.y = entity.position.y;
            break;
        case 9:
            // Bottom Right
            text.position.x = entity.position.x - textWidth;
            text.position.y = entity.position.y;
            break;

        default:
            return undefined;
    };

    return text;
}

export function drawSpline(entity, data) {
    var color = getColor(entity, data);

    var points = entity.controlPoints.map(function (vec) {
        return new THREE.Vector2(vec.x, vec.y);
    });

    var interpolatedPoints = [];
    if (entity.degreeOfSplineCurve === 2 || entity.degreeOfSplineCurve === 3) {
        for (var i = 0; i + 2 < points.length; i = i + 2) {
            if (entity.degreeOfSplineCurve === 2) {
                curve = new THREE.QuadraticBezierCurve(points[i], points[i + 1], points[i + 2]);
            } else {
                curve = new THREE.QuadraticBezierCurve3(points[i], points[i + 1], points[i + 2]);
            }
            interpolatedPoints.push.apply(interpolatedPoints, curve.getPoints(50));
        }
    } else {
        curve = new THREE.SplineCurve(points);
        interpolatedPoints = curve.getPoints(100);
    }

    var geometry = new THREE.BufferGeometry().setFromPoints(interpolatedPoints);
    var material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });
    var splineObject = new THREE.Line(geometry, material);

    return splineObject;
}

export function drawLine(entity, data) {
    var geometry = new THREE.Geometry(),
        color = getColor(entity, data),
        material, lineType, vertex, startPoint, endPoint, bulgeGeometry,
        bulge, i, line;

    // create geometry
    for (i = 0; i < entity.vertices.length; i++) {

        if (entity.vertices[i].bulge) {
            bulge = entity.vertices[i].bulge;
            startPoint = entity.vertices[i];
            endPoint = i + 1 < entity.vertices.length ? entity.vertices[i + 1] : geometry.vertices[0];

            bulgeGeometry = new THREE.BulgeGeometry(startPoint, endPoint, bulge);

            geometry.vertices.push.apply(geometry.vertices, bulgeGeometry.vertices);
        } else {
            vertex = entity.vertices[i];
            geometry.vertices.push(new THREE.Vector3(vertex.x, vertex.y, 0));
        }

    }
    if (entity.shape) geometry.vertices.push(geometry.vertices[0]);


    // set material
    if (entity.lineType) {
        lineType = data.tables.lineType.lineTypes[entity.lineType];
    }

    if (lineType && lineType.pattern && lineType.pattern.length !== 0) {
        material = new THREE.LineDashedMaterial({ color: color, gapSize: 1, dashSize: 2 });
    } else {
        material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });
    }

    // if(lineType && lineType.pattern && lineType.pattern.length !== 0) {

    //           geometry.computeLineDistances();

    //           // Ugly hack to add diffuse to this. Maybe copy the uniforms object so we
    //           // don't add diffuse to a material.
    //           lineType.material.uniforms.diffuse = { type: 'c', value: new THREE.Color(color) };

    // 	material = new THREE.ShaderMaterial({
    // 		uniforms: lineType.material.uniforms,
    // 		vertexShader: lineType.material.vertexShader,
    // 		fragmentShader: lineType.material.fragmentShader
    // 	});
    // }else {
    // 	material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });
    // }

    line = new THREE.Line(geometry, material);
    //line.computeLineDistances();
    return line;
}

export function drawArc(entity, data) {
    var endAngle, startAngle
    if (entity.type === 'CIRCLE') {
        startAngle = entity.startAngle || 0;
        endAngle = startAngle + 2 * Math.PI;
    } else {
        startAngle = entity.startAngle;
        endAngle = entity.endAngle;
    }

    var curve = new THREE.ArcCurve(
        0, 0,
        entity.radius,
        startAngle,
        endAngle);

    var points = curve.getPoints(15);
    var geometry = new THREE.BufferGeometry().setFromPoints(points);

    var material = new THREE.LineBasicMaterial({ color: getColor(entity, data) });

    var arc = new THREE.Line(geometry, material);
    arc.position.x = entity.center.x;
    arc.position.y = entity.center.y;
    arc.position.z = entity.center.z;

    return arc;
}

export function drawSolid(entity, data) {
    var material, mesh, verts,
        geometry = new THREE.Geometry();

    verts = geometry.vertices;
    verts.push(new THREE.Vector3(entity.points[0].x, entity.points[0].y, entity.points[0].z));
    verts.push(new THREE.Vector3(entity.points[1].x, entity.points[1].y, entity.points[1].z));
    verts.push(new THREE.Vector3(entity.points[2].x, entity.points[2].y, entity.points[2].z));
    verts.push(new THREE.Vector3(entity.points[3].x, entity.points[3].y, entity.points[3].z));

    // Calculate which direction the points are facing (clockwise or counter-clockwise)
    var vector1 = new THREE.Vector3();
    var vector2 = new THREE.Vector3();
    vector1.subVectors(verts[1], verts[0]);
    vector2.subVectors(verts[2], verts[0]);
    vector1.cross(vector2);

    // If z < 0 then we must draw these in reverse order
    if (vector1.z < 0) {
        geometry.faces.push(new THREE.Face3(2, 1, 0));
        geometry.faces.push(new THREE.Face3(2, 3, 1));
    } else {
        geometry.faces.push(new THREE.Face3(0, 1, 2));
        geometry.faces.push(new THREE.Face3(1, 3, 2));
    }


    material = new THREE.MeshBasicMaterial({ color: getColor(entity, data) });

    return new THREE.Mesh(geometry, material);

}

export function drawText(entity, data,font) {
    var material, text;

    if (!font)
        return console.warn('Text is not supported without a Three.js font loaded with THREE.FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or Three.js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details.');


    var geometry = new THREE.TextGeometry(entity.text, { font: font, height: 0, curveSegments: 1, size: entity.textHeight || 12 });
    material = new THREE.MeshBasicMaterial({ color: getColor(entity, data) });

    text = new THREE.Mesh(geometry, material);
    text.position.x = entity.startPoint.x;
    text.position.y = entity.startPoint.y;
    text.position.z = entity.startPoint.z;

    return text;
}

export function drawPoint(entity, data,scene) {
    var geometry, material, point;

    geometry = new THREE.Geometry();

    geometry.vertices.push(new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z));

    // TODO: could be more efficient. PointCloud per layer?

    var numPoints = 1;

    var color = getColor(entity, data);
    var colors = new Float32Array(numPoints * 3);
    colors[0] = color.r;
    colors[1] = color.g;
    colors[2] = color.b;

    geometry.colors = colors;
    geometry.computeBoundingBox();

    material = new THREE.PointsMaterial({ size: 0.05, vertexColors: THREE.VertexColors });
    point = new THREE.Points(geometry, material);
    scene.add(point);
}

export function drawBlock(entity, data,scene) {
    var block = data.blocks[entity.name];

    if (!block.entities) return null;

    var group = new THREE.Object3D()

    if (entity.xScale) group.scale.x = entity.xScale;
    if (entity.yScale) group.scale.y = entity.yScale;

    if (entity.rotation) {
        group.rotation.z = entity.rotation * Math.PI / 180;
    }

    if (entity.position) {
        group.position.x = entity.position.x;
        group.position.y = entity.position.y;
        group.position.z = entity.position.z;
    }

    for (var i = 0; i < block.entities.length; i++) {
        var childEntity = drawEntity(block.entities[i], data, group,scene);
        if (childEntity) group.add(childEntity);
    }

    return group;
}

export function getColor(entity, data) {
    var color = 0x000000; //default
    if (entity.color) color = entity.color;
    else if (data.tables && data.tables.layer && data.tables.layer.layers[entity.layer])
        color = data.tables.layer.layers[entity.layer].color;

    if (color == null || color === 0xffffff) {
        color = 0x000000;
    }
    return color;
}

export function createLineTypeShaders(data) {
    var ltype, type;
    if (!data.tables || !data.tables.lineType) return;
    var ltypes = data.tables.lineType.lineTypes;

    for (type in ltypes) {
        ltype = ltypes[type];
        if (!ltype.pattern) continue;
        ltype.material = createDashedLineShader(ltype.pattern);
    }
}

export function createDashedLineShader(pattern) {
    var i,
        dashedLineShader = {},
        totalLength = 0.0;

    for (i = 0; i < pattern.length; i++) {
        totalLength += Math.abs(pattern[i]);
    }

    dashedLineShader.uniforms = THREE.UniformsUtils.merge([

        THREE.UniformsLib['common'],
        THREE.UniformsLib['fog'],

        {
            'pattern': { type: 'fv1', value: pattern },
            'patternLength': { type: 'f', value: totalLength }
        }

    ]);

    dashedLineShader.vertexShader = [
        'attribute float lineDistance;',

        'varying float vLineDistance;',

        THREE.ShaderChunk['color_pars_vertex'],

        'void main() {',

        THREE.ShaderChunk['color_vertex'],

        'vLineDistance = lineDistance;',

        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

        '}'
    ].join('\n');

    dashedLineShader.fragmentShader = [
        'uniform vec3 diffuse;',
        'uniform float opacity;',

        'uniform float pattern[' + pattern.length + '];',
        'uniform float patternLength;',

        'varying float vLineDistance;',

        THREE.ShaderChunk['color_pars_fragment'],
        THREE.ShaderChunk['fog_pars_fragment'],

        'void main() {',

        'float pos = mod(vLineDistance, patternLength);',

        'for ( int i = 0; i < ' + pattern.length + '; i++ ) {',
        'pos = pos - abs(pattern[i]);',
        'if( pos < 0.0 ) {',
        'if( pattern[i] > 0.0 ) {',
        'gl_FragColor = vec4(1.0, 0.0, 0.0, opacity );',
        'break;',
        '}',
        'discard;',
        '}',

        '}',

        THREE.ShaderChunk['color_fragment'],
        THREE.ShaderChunk['fog_fragment'],

        '}'
    ].join('\n');

    return dashedLineShader;
}

export function findExtents(scene) {
    for (var child of scene.children) {
        var minX, maxX, minY, maxY;
        if (child.position) {
            minX = Math.min(child.position.x, minX);
            minY = Math.min(child.position.y, minY);
            maxX = Math.max(child.position.x, maxX);
            maxY = Math.max(child.position.y, maxY);
        }
    }

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
export function renderGeometry(obj,layer_num,res_entities,scene) {
    if (!layer_num[obj.userData.type]) {
        layer_num[obj.userData.type] = 0
    }
    layer_num[obj.userData.type]++
    switch (obj.userData.type) {
        case "LINE":
        case "LWPOLYLINE":
        case "POLYLINE":
            if (obj.userData.lineType && obj.userData.lineType.pattern && obj.userData.lineType.pattern.length !== 0) {
                // scene.add(obj);
            }
            else {
                if (!res_entities[obj.userData.layer]) {
                    res_entities[obj.userData.layer] = { points: [], colors: [], indices: [] }
                }

                obj.geometry.vertices.map(function (e, i) {
                    if (i == 0 || i == obj.geometry.vertices.length - 1) {
                        res_entities[obj.userData.layer].indices.push(res_entities[obj.userData.layer].points.length / 3)
                    }
                    else {
                        res_entities[obj.userData.layer].indices.push(res_entities[obj.userData.layer].points.length / 3, res_entities[obj.userData.layer].points.length / 3)
                    }
                    res_entities[obj.userData.layer].points.push(e.x, e.y, e.z)
                    //obj.material
                    //console.log(obj.material)
                    res_entities[obj.userData.layer].colors.push(obj.material.color.r, obj.material.color.g, obj.material.color.b);
                })
            }
            break;
        case "MTEXT":
        case "TEXT":
        case "CIRCLE":
        case "ARC":
            scene.add(obj);
            break;
        default:
            //scene.add(obj);
            break;
    }
}





